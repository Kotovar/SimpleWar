import {
  BEACON_DURATION,
  BUILDINGS_CONFIG,
  type MilitaryUnit,
} from '@shared/config';
import { createExplorationDanger } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { chebyshev, manhattan, around } from '../geometry';
import { pathsFrom, stepToward, standCells } from '../movement';
import { resourceSites } from '../facts';
import { affordable } from '../saving';
import { isFree, moveTo, taskOf } from './common';
import { siteOk } from './building';
import { campRecruit } from './campRecruitment';
import { unitsOf } from './roleKit';

/** Общая оценка опасности на пути разведчика к находкам и руинам. */
export const siteDanger = (ctx: AiContext) =>
  createExplorationDanger(
    ctx.width,
    ctx.height,
    [...ctx.enemies, ...ctx.remembered].filter(
      enemy =>
        enemy.kind === 'building' ||
        (enemy.certainty === 1 &&
          enemy.kind === 'unit' &&
          enemy.type !== 'worker'),
    ),
  );

/** Путь R08 сохраняет ту же маску опасности при реальном исполнении команды. */
const siteMoves = (
  ctx: AiContext,
  unit: MilitaryUnit,
  danger: ReturnType<typeof siteDanger>,
): Candidate[] => {
  const here = danger[unit.y * ctx.width + unit.x];
  const avoid = danger.map(depth => (depth > here ? 1 : 0));
  for (const strike of ctx.obs.strikes)
    avoid[strike.y * ctx.width + strike.x] = 1;
  return (ctx.obs.sites ?? []).flatMap((site): Candidate[] => {
    if (site.type === 'ruins' || danger[site.y * ctx.width + site.x]) return [];
    if (
      site.type === 'refugees' &&
      ctx.obs.population.occupied >= ctx.obs.population.max
    )
      return [];
    // У лагеря разведчик уже на месте: найм — дело N05, обход только снимет маскировку.
    if (
      site.type === 'camp' &&
      (site.hiresLeft <= 0 ||
        chebyshev(unit, site) === 1 ||
        !campRecruit(ctx, site))
    )
      return [];
    const goals = site.type === 'camp' ? standCells(ctx, site) : [site];
    const step = stepToward(ctx, unit, goals, avoid);
    if (!step || ctx.threatAt(step.next, 'scout') > ctx.threatAt(unit, 'scout'))
      return [];
    const { next, total } = step;
    return [
      {
        ...moveTo(
          'R08',
          unit,
          next,
          (site.type === 'camp' ? 76 : 84) - Math.min(15, total / 3),
          'иду к известной находке',
          {
            basis: { site: site.type, x: site.x, y: site.y },
          },
        ),
        action: { type: 'move', unitId: unit.id, ...next, avoid },
      },
    ];
  });
};

export const R08: AiRule = {
  id: 'R08',
  group: 'scout',
  title: 'Сбор находок',
  evaluate: ctx => {
    if (!ctx.obs.sites?.length) return [];
    const ready = unitsOf(ctx, 'scout').filter(
      unit =>
        unit.movePoints > 0 &&
        (!taskOf(ctx, unit.id) || taskOf(ctx, unit.id)?.kind === 'scout'),
    );
    if (!ready.length) return [];
    const danger = siteDanger(ctx);
    return ready.flatMap(unit => siteMoves(ctx, unit, danger));
  },
};

export const R09: AiRule = {
  id: 'R09',
  group: 'scout',
  title: 'Сигнальный костёр',
  evaluate: ctx => {
    if (!affordable(ctx, BUILDINGS_CONFIG.beacon.cost)) return [];
    const buildings = [
      ...ctx.obs.ownBuildings,
      ...(ctx.obs.alliedBuildings ?? []),
    ];
    const richSites = resourceSites(ctx, 'gold').filter(
      site =>
        ctx.obs.knownRichGold?.[site.y]?.[site.x] &&
        !buildings.some(b => manhattan(b, site) <= b.sightRange) &&
        ctx.workers.some(worker => {
          if (worker.workplaceId || worker.maxMovePoints <= 0) return false;
          const { cost } = pathsFrom(ctx, worker);
          return standCells(ctx, site).some(
            cell =>
              (cost.get(cell.y * ctx.width + cell.x) ?? Infinity) <
              worker.maxMovePoints * BEACON_DURATION,
          );
        }),
    );
    return unitsOf(ctx, 'scout').flatMap((unit): Candidate[] => {
      if (
        !isFree(ctx, unit.id) ||
        unit.attackPoints <= 0 ||
        ctx.threatAt(unit, 'scout') > 0
      )
        return [];
      const nearBase =
        ctx.base &&
        manhattan(unit, ctx.base) >= 3 &&
        manhattan(unit, ctx.base) <= 9;
      const front = ctx.memory.operation.target;
      const rich = richSites.find(site => manhattan(unit, site) <= 6);
      const watch =
        !ctx.frontier.length &&
        (nearBase || (front && manhattan(unit, front) <= 8));
      if (!rich && !watch) return [];
      const cell = around(unit).find(
        p =>
          ctx.obs.visible[p.y]?.[p.x] &&
          siteOk(ctx, 'beacon', p) &&
          !ctx.struck(p) &&
          (!rich || manhattan(p, rich) <= BUILDINGS_CONFIG.beacon.sightRange) &&
          !buildings.some(
            b => manhattan(b, p) <= (b.type === 'beacon' ? 5 : 2),
          ),
      );
      return cell
        ? [
            {
              ruleId: 'R09',
              group: 'scout',
              actorId: unit.id,
              action: { type: 'lightBeacon', unitId: unit.id, ...cell },
              score: rich ? 68 : 46,
              reason: rich
                ? 'оставляю обзор богатой жилы для рабочего'
                : 'оставляю обзор на подходах',
            },
          ]
        : [];
    });
  },
};
