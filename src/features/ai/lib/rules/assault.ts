import type { Position } from '@shared/config';
import type { AiRule } from '../../model/types';
import type { AiContext } from '../context';
import { manhattan } from '../geometry';
import { standCells, stepToward } from '../movement';
import { strikeGroup } from '../operation';
import { moveTo } from './common';
import { swordsmen } from './soldiers';

/** M03: группа собирается — идти к месту сбора, не атаковать в одиночку. */
export const M03: AiRule = {
  id: 'M03',
  group: 'attack',
  title: 'Сбор группы',
  evaluate: ctx => {
    const { phase, rally } = ctx.memory.operation;
    if (phase !== 'gather' || !rally) return [];
    const group = new Set(strikeGroup(ctx).map(({ id }) => id));
    return swordsmen(ctx)
      .filter(unit => group.has(unit.id) && manhattan(unit, rally) > 2)
      .flatMap(unit => {
        const step = stepToward(ctx, unit, [rally, ...standCells(ctx, rally)]);
        return step
          ? [
              moveTo('M03', unit, step.next, 30, 'иду к месту сбора', {
                group: 'attack',
              }),
            ]
          : [];
      });
  },
};

/**
 * Куда встать при наступлении: вплотную к цели, к видимым врагам рядом с
 * ней, а если всё занято — как можно ближе: группа не стоит на месте.
 */
const assaultGoals = (ctx: AiContext, target: Position): Position[] => {
  const goals = ctx.occupied(target.x, target.y)
    ? standCells(ctx, target, false)
    : [target];
  for (const enemy of ctx.enemies) {
    if (manhattan(enemy, target) <= 5)
      goals.push(...standCells(ctx, enemy, false));
  }
  if (goals.length) return goals;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const cell = { x: target.x + dx, y: target.y + dy };
      if (
        ctx.inside(cell) &&
        !ctx.occupied(cell.x, cell.y) &&
        ctx.grid(1)[cell.y][cell.x] > 0
      ) {
        goals.push(cell);
      }
    }
  }
  return goals;
};

/** M04: группа готова — наступать на цель, открывая путь стрелкам. */
export const M04: AiRule = {
  id: 'M04',
  group: 'attack',
  title: 'Наступление',
  evaluate: ctx => {
    const { phase, target } = ctx.memory.operation;
    if ((phase !== 'advance' && phase !== 'engage') || !target) return [];
    const group = new Set(strikeGroup(ctx).map(({ id }) => id));
    return swordsmen(ctx)
      .filter(unit => group.has(unit.id))
      .flatMap(unit => {
        const step = stepToward(ctx, unit, assaultGoals(ctx, target));
        return step
          ? [
              moveTo('M04', unit, step.next, 50, 'наступаю на цель', {
                group: 'attack',
                basis: { x: target.x, y: target.y },
              }),
            ]
          : [];
      });
  },
};
