import { BUILDINGS_CONFIG, type MilitaryUnit } from '@shared/config';
import { createExplorationDanger } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { chebyshev, manhattan, around } from '../geometry';
import { stepToward, standCells } from '../movement';
import { affordable } from '../saving';
import { isFree, moveTo, taskOf, wouldBlock } from './common';
import { campRecruit } from './campRecruitment';
import { unitsOf } from './roleKit';

/** Опасность для R08 одна на всех разведчиков шага. */
const siteDanger = (ctx: AiContext) =>
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
          (site.type === 'camp' ? 54 : 68) - Math.min(15, total / 3),
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
    if (ctx.frontier.length || !affordable(ctx, BUILDINGS_CONFIG.beacon.cost))
      return [];
    const buildings = [
      ...ctx.obs.ownBuildings,
      ...(ctx.obs.alliedBuildings ?? []),
    ];
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
      if (!nearBase && (!front || manhattan(unit, front) > 8)) return [];
      const cell = around(unit).find(
        p =>
          ctx.obs.visible[p.y]?.[p.x] &&
          ['grass', 'hill'].includes(ctx.known(p.x, p.y) ?? '') &&
          !ctx.occupied(p.x, p.y) &&
          ctx.threatAt(p) === 0 &&
          !ctx.struck(p) &&
          !(ctx.obs.sites ?? []).some(
            site => site.x === p.x && site.y === p.y,
          ) &&
          !buildings.some(
            b => manhattan(b, p) <= (b.type === 'beacon' ? 5 : 2),
          ) &&
          !wouldBlock(ctx, p),
      );
      return cell
        ? [
            {
              ruleId: 'R09',
              group: 'scout',
              actorId: unit.id,
              action: { type: 'lightBeacon', unitId: unit.id, ...cell },
              score: 46,
              reason: 'оставляю обзор на подходах',
            },
          ]
        : [];
    });
  },
};
