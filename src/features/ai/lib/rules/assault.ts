import type { MilitaryUnit, Position } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import { approachReach, countReachable } from '../approach';
import type { AiContext } from '../context';
import { cellKey, fromKey, manhattan } from '../geometry';
import { pathsFrom, standCells, stepToward } from '../movement';
import { strikeGroup } from '../operation';
import { moveTo } from './common';
import { swordsmen } from './soldiers';
import { followGroup } from './roleKit';

/** M03: сбор или отход — вернуться к месту сбора группы. */
export const M03: AiRule = {
  id: 'M03',
  group: 'attack',
  title: 'Сбор группы',
  evaluate: ctx => {
    const { phase, rally } = ctx.memory.operation;
    if (phase === 'retreat')
      return swordsmen(ctx).flatMap(unit => followGroup(ctx, 'M03', unit, 30));
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

/** Лучшая клетка атаки: занять её, не закрыв подход к остальным. */
const pickAssaultCell = (
  ctx: AiContext,
  unit: MilitaryUnit,
  target: Position,
  goals: Position[],
): Position | null => {
  const { cost, width } = pathsFrom(ctx, unit);
  const reachable = goals
    .map(goal => ({ goal, cost: cost.get(cellKey(goal.x, goal.y, width)) }))
    .filter((item): item is { goal: Position; cost: number } => !!item.cost)
    .sort((a, b) => a.cost - b.cost)
    .slice(0, 5);
  let best: Position | null = null;
  let bestScore = -Infinity;
  for (const { goal, cost: price } of reachable) {
    const others = goals.filter(g => g !== goal);
    const open = countReachable(ctx, approachReach(ctx, target, goal), others);
    const score = open * 100 - price;
    if (score > bestScore) {
      best = goal;
      bestScore = score;
    }
  }
  return best;
};

/** Ближайшая к цели достижимая клетка, если подходы к ней заняты. */
const closestReachable = (
  ctx: AiContext,
  unit: MilitaryUnit,
  target: Position,
): Position | null => {
  const { cost, width } = pathsFrom(ctx, unit);
  let best: Position | null = null;
  let bestScore = manhattan(unit, target) * 100;
  cost.forEach((price, key) => {
    const cell = fromKey(key, width);
    const score = manhattan(cell, target) * 100 + price;
    if (price > 0 && !ctx.occupied(cell.x, cell.y) && score < bestScore) {
      best = cell;
      bestScore = score;
    }
  });
  return best;
};

/**
 * Атакующий вплотную к цели, закрывший единственный подход, переходит на
 * другую клетку атаки до удара: удар обнуляет движение.
 */
const makeRoom = (
  ctx: AiContext,
  unit: MilitaryUnit,
  target: Position,
  goals: Position[],
): Candidate[] => {
  for (const goal of goals) {
    const step = stepToward(ctx, unit, [goal]);
    if (!step || step.next.x !== goal.x || step.next.y !== goal.y) continue;
    const reach = approachReach(ctx, target, goal, unit);
    const others = [unit, ...goals.filter(g => g !== goal)];
    if (countReachable(ctx, reach, others) === 0) continue;
    return [
      moveTo('M04', unit, goal, 70, 'освобождаю подход к цели', {
        group: 'attack',
        basis: { x: target.x, y: target.y },
      }),
    ];
  }
  return [];
};

/**
 * M04: группа готова — наступать на цель, открывая путь стрелкам. Клетку
 * атаки выбирает так, чтобы не закрыть подход остальным; если подходы
 * заняты — подходит ближе, а стоящий в проходе атакующий уступает его.
 */
export const M04: AiRule = {
  id: 'M04',
  group: 'attack',
  title: 'Наступление',
  evaluate: ctx => {
    const { phase, target } = ctx.memory.operation;
    if ((phase !== 'advance' && phase !== 'engage') || !target) return [];
    const group = strikeGroup(ctx);
    const members = new Set(group.map(({ id }) => id));
    const goals = assaultGoals(ctx, target);
    const sealed =
      countReachable(ctx, approachReach(ctx, target), goals) === 0 &&
      group.some(u => manhattan(u, target) > 1 && u.movePoints > 0);
    return swordsmen(ctx)
      .filter(unit => members.has(unit.id) && unit.movePoints > 0)
      .flatMap((unit): Candidate[] => {
        if (manhattan(unit, target) <= 1) {
          return sealed ? makeRoom(ctx, unit, target, goals) : [];
        }
        const goal = pickAssaultCell(ctx, unit, target, goals);
        const cell = goal ?? closestReachable(ctx, unit, target);
        const step = cell && stepToward(ctx, unit, [cell]);
        return step
          ? [
              moveTo(
                'M04',
                unit,
                step.next,
                50,
                goal ? 'наступаю на цель' : 'подходы заняты: подхожу ближе',
                { group: 'attack', basis: { x: target.x, y: target.y } },
              ),
            ]
          : [];
      });
  },
};
