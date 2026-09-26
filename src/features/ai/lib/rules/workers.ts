import type { AiRule, Candidate } from '../../model/types';
import {
  plannedCosts,
  idleWorkplaces,
  isNear,
  nearest,
  resourceSites,
  scarceResource,
} from '../facts';
import { manhattan } from '../geometry';
import { standCells, stepToward } from '../movement';
import { bestMove, isFree, moveTo, taskOf } from './common';
import { buildStep, continueBuilds, idleWorkers } from './building';

/** W01: рабочий в известной опасности уходит к защите, бросая работу. */
export const W01: AiRule = {
  id: 'W01',
  group: 'defense',
  title: 'Эвакуация рабочего',
  evaluate: ctx =>
    ctx.workers.flatMap(worker => {
      if (!isFree(ctx, worker.id) || worker.movePoints <= 0) return [];
      const danger = ctx.threatAt(worker);
      if (danger === 0) return [];
      const home = ctx.base ?? worker;
      const cell = bestMove(
        ctx,
        worker,
        cell => -ctx.threatAt(cell) * 10 - manhattan(cell, home),
      );
      if (!cell || ctx.threatAt(cell) >= danger) return [];
      return [
        moveTo('W01', worker, cell, 90, 'рабочий в опасности: ухожу', {
          group: 'defense',
          basis: { danger },
        }),
      ];
    }),
};

/**
 * Общая часть W02/W03: занять свободное безопасное место добычи нужного
 * ресурса — рядом назначиться, иначе идти к нему.
 */
const takeWorkplace =
  (
    ruleId: 'W02' | 'W03',
    type: 'mine' | 'sawmill',
    resource: 'gold' | 'wood',
  ): AiRule['evaluate'] =>
  ctx => {
    const places = idleWorkplaces(ctx).filter(
      building => building.type === type && ctx.threatAt(building) === 0,
    );
    if (!places.length) return [];
    const score = scarceResource(ctx) === resource ? 70 : 50;
    const claimed = new Set<string>();
    return idleWorkers(ctx).flatMap((worker): Candidate[] => {
      const place = nearest(
        worker,
        places.filter(({ id }) => !claimed.has(id)),
      );
      if (!place) return [];
      claimed.add(place.id);
      const basis = { building: type, x: place.x, y: place.y, resource };
      if (isNear(worker, place)) {
        return [
          {
            ruleId,
            group: 'economy',
            actorId: worker.id,
            action: {
              type: 'assign',
              workerId: worker.id,
              buildingId: place.id,
            },
            score,
            reason: `нужно ${resource === 'gold' ? 'золото' : 'дерево'}: встаю на добычу`,
            basis,
          },
        ];
      }
      const step = stepToward(ctx, worker, standCells(ctx, place));
      return step
        ? [
            moveTo(ruleId, worker, step.next, score - 5, 'иду к месту добычи', {
              basis,
            }),
          ]
        : [];
    });
  };

/** W02: дефицит золота и свободный рудник — занять его. */
export const W02: AiRule = {
  id: 'W02',
  group: 'economy',
  title: 'Работа на руднике',
  evaluate: takeWorkplace('W02', 'mine', 'gold'),
};

/** W03: дефицит дерева и свободная лесопилка — занять её. */
export const W03: AiRule = {
  id: 'W03',
  group: 'economy',
  title: 'Работа на лесопилке',
  evaluate: takeWorkplace('W03', 'sawmill', 'wood'),
};

/**
 * W04: нужного места добычи нет и ресурс не найден — рабочий разведывает
 * безопасную границу недалеко от базы, пока нет разведчика.
 */
export const W04: AiRule = {
  id: 'W04',
  group: 'scout',
  title: 'Поиск ресурса рабочим',
  evaluate: ctx => {
    const need = scarceResource(ctx);
    const hasPlace = idleWorkplaces(ctx).some(
      ({ type }) => type === (need === 'gold' ? 'mine' : 'sawmill'),
    );
    const known = resourceSites(ctx, need === 'gold' ? 'gold' : 'forest');
    const scouting = ctx.memory.tasks.some(({ kind }) => kind === 'scout');
    if (hasPlace || known.length || scouting || !ctx.base) return [];
    const base = ctx.base;
    const frontier = ctx.frontier.filter(
      cell =>
        manhattan(cell, base) <= ctx.config.workerScoutRadius &&
        ctx.threatAt(cell) === 0,
    );
    const worker = idleWorkers(ctx).find(({ movePoints }) => movePoints > 0);
    if (!worker || !frontier.length) return [];
    const step = stepToward(ctx, worker, frontier);
    return step
      ? [
          moveTo(
            'W04',
            worker,
            step.next,
            30,
            `ищу ${need === 'gold' ? 'золото' : 'лес'}`,
            {
              group: 'scout',
            },
          ),
        ]
      : [];
  },
};

/**
 * W05: найден безопасный ресурс, хватает бюджета — построить рудник или
 * лесопилку; потом W02/W03 назначат рабочего.
 */
export const W05: AiRule = {
  id: 'W05',
  group: 'build',
  title: 'Новая добыча',
  evaluate: ctx => {
    const continued = continueBuilds(ctx, 'W05', 'build', 62);
    if (continued.length) return continued;
    const building = ctx.memory.tasks.some(({ ruleId }) => ruleId === 'W05');
    if (building || !ctx.base) return [];
    const need = scarceResource(ctx);
    const order: ('gold' | 'wood')[] =
      need === 'gold' ? ['gold', 'wood'] : ['wood', 'gold'];
    const nextCosts = plannedCosts(ctx);
    for (const resource of order) {
      const type = resource === 'gold' ? 'mine' : 'sawmill';
      const own = ctx.obs.ownBuildings.some(b => b.type === type);
      // Ресурса хватает на ближайшие траты — новая добыча не нужна.
      if (own && ctx.obs.stock[resource] >= nextCosts[resource]) continue;
      // Пока есть простаивающее место этого типа, новое не строим.
      if (idleWorkplaces(ctx).some(b => b.type === type)) continue;
      const site = nearest(
        ctx.base,
        resourceSites(ctx, resource === 'gold' ? 'gold' : 'forest'),
      );
      if (!site) continue;
      const worker = [...idleWorkers(ctx)].sort(
        (a, b) => manhattan(a, site) - manhattan(b, site),
      )[0];
      if (!worker || taskOf(ctx, worker.id)) continue;
      const score = resource === need ? 60 : 45;
      const result = buildStep(
        ctx,
        'W05',
        'build',
        worker,
        type,
        site,
        score,
        `строю ${type === 'mine' ? 'рудник' : 'лесопилку'}`,
      );
      if (result.length) return result;
    }
    return [];
  },
};
