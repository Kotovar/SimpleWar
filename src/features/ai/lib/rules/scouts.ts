import {
  MILITARY_UNITS_CONFIG,
  type MilitaryUnit,
  type Position,
} from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { nearest, resourceSites } from '../facts';
import { manhattan, tieBreak } from '../geometry';
import { pathsFrom, stepToward } from '../movement';
import { moveTo, taskOf } from './common';
import { cellsNear, unitsOf } from './roleKit';

export const SCOUT_SIGHT = MILITARY_UNITS_CONFIG.scout.sightRange;

/** Разведчики без чужой задачи (G05/G07 ведут свои). */
export const scouts = (ctx: AiContext, ruleId?: string) =>
  unitsOf(ctx, 'scout').filter(unit => {
    const task = taskOf(ctx, unit.id);
    return !task || task.ruleId === ruleId;
  });

/** Сколько неизвестных клеток откроется с клетки при обзоре разведчика. */
const reveal = (ctx: AiContext, from: Position) => {
  let count = 0;
  for (let dy = -SCOUT_SIGHT; dy <= SCOUT_SIGHT; dy++) {
    for (let dx = -SCOUT_SIGHT; dx <= SCOUT_SIGHT; dx++) {
      const cell = { x: from.x + dx, y: from.y + dy };
      if (manhattan(cell, from) > SCOUT_SIGHT || !ctx.inside(cell)) continue;
      if (!ctx.known(cell.x, cell.y)) count++;
    }
  }
  return count;
};

/** Шаг разведчика к цели с задачей разведки, чтобы цель держалась. */
export const scoutTo = (
  ctx: AiContext,
  ruleId: string,
  unit: MilitaryUnit,
  target: Position,
  score: number,
  reason: string,
  withTask = true,
): Candidate[] => {
  const step = stepToward(ctx, unit, [target]);
  // Разведка не входит под известный удар: иначе R06 уводит назад.
  if (
    !step ||
    ctx.threatAt(step.next, unit.type) > ctx.threatAt(unit, unit.type)
  )
    return [];
  const task = {
    kind: 'scout' as const,
    ruleId,
    unitId: unit.id,
    target,
    reserve: { gold: 0, wood: 0 },
  };
  return [
    moveTo(ruleId, unit, step.next, score, reason, {
      basis: { x: target.x, y: target.y },
      ...(withTask ? { task } : {}),
    }),
  ];
};

/**
 * R01: есть непроверенная граница — идти туда, где откроется больше всего
 * неизвестного за дёшево и без известной угрозы.
 */
export const R01: AiRule = {
  id: 'R01',
  group: 'scout',
  title: 'Разведка границы',
  evaluate: ctx =>
    scouts(ctx, 'R01').flatMap(unit => {
      if (unit.movePoints <= 0) return [];
      const task = taskOf(ctx, unit.id);
      if (task)
        return scoutTo(ctx, 'R01', unit, task.target, 38, 'иду к границе');
      const { cost, width } = pathsFrom(ctx, unit);
      const target = ctx.frontier
        .filter(c => ctx.threatAt(c, 'scout') === 0)
        .map(c => ({
          c,
          value:
            reveal(ctx, c) / (1 + (cost.get(c.y * width + c.x) ?? Infinity)) +
            tieBreak(`${c.x},${c.y}`, ctx.memory.seed) * 0.01,
        }))
        .sort((a, b) => b.value - a.value)[0]?.c;
      return target
        ? scoutTo(ctx, 'R01', unit, target, 38, 'раскрываю новую территорию')
        : [];
    }),
};

/** R02: нужного ресурса не видно — обследовать ближайший к базе неизвестный сектор. */
export const R02: AiRule = {
  id: 'R02',
  group: 'scout',
  title: 'Поиск ресурса',
  evaluate: ctx => {
    const has = (type: string) =>
      ctx.obs.ownBuildings.some(building => building.type === type);
    const missing =
      (!has('mine') && !resourceSites(ctx, 'gold').length) ||
      (!has('sawmill') && !resourceSites(ctx, 'forest').length);
    const home = ctx.base;
    if (!missing || !home) return [];
    return scouts(ctx).flatMap(unit => {
      if (unit.movePoints <= 0 || taskOf(ctx, unit.id)) return [];
      const target = [...ctx.frontier]
        .filter(c => ctx.threatAt(c, 'scout') === 0)
        .sort(
          (a, b) =>
            manhattan(a, home) -
            reveal(ctx, a) / 4 -
            (manhattan(b, home) - reveal(ctx, b) / 4),
        )[0];
      return target
        ? scoutTo(ctx, 'R02', unit, target, 45, 'ищу ресурс', false)
        : [];
    });
  },
};

/** R03: контакт устарел — проверить его последнее место. */
export const R03: AiRule = {
  id: 'R03',
  group: 'scout',
  title: 'Проверка контакта разведчиком',
  evaluate: ctx => {
    const stale = ctx.obs.contacts.filter(({ kind }) => kind === 'unit');
    if (!stale.length) return [];
    return scouts(ctx).flatMap(unit => {
      if (unit.movePoints <= 0 || taskOf(ctx, unit.id)) return [];
      const contact = nearest(unit, stale);
      if (!contact) return [];
      // Встать рядом: клетка контакта могла стать занятой.
      const step = stepToward(ctx, unit, cellsNear(ctx, contact, 1));
      return step
        ? [
            moveTo('R03', unit, step.next, 34, 'проверяю старый контакт', {
              basis: { x: contact.x, y: contact.y, seen: contact.seenTurn },
            }),
          ]
        : [];
    });
  },
};
