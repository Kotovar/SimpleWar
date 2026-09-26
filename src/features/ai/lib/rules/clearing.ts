import type { Position } from '@shared/config';
import { findCheapestPaths } from '@shared/lib';
import type { AiRule } from '../../model/types';
import type { AiContext } from '../context';
import { baseAlarm, nearest } from '../facts';
import { around, cellKey, manhattan } from '../geometry';
import { standCells } from '../movement';
import { idleWorkers } from './building';

/** Цена пути от базы до цели с учётом клетки, будто она расчищена. */
const pathCost = (
  ctx: AiContext,
  from: Position,
  goal: Position,
  cleared?: Position,
) => {
  const grid = ctx.grid(2).map(row => [...row]);
  if (cleared) grid[cleared.y][cleared.x] = 1;
  const { cost, width } = findCheapestPaths(grid, from);
  return cost.get(cellKey(goal.x, goal.y, width)) ?? Infinity;
};

/**
 * X01 (приёмка S12): расчистить соседний видимый лес, если он заметно
 * сокращает путь от базы к цели по известной карте, угрозы нет, и это не
 * последняя известная площадка под лесопилку.
 */
export const X01: AiRule = {
  id: 'X01',
  group: 'economy',
  title: 'Полезная расчистка',
  evaluate: ctx => {
    const { base } = ctx;
    if (!base || baseAlarm(ctx).length) return [];
    const goal = nearest(
      base,
      ctx.frontier.filter(c => manhattan(c, base) > 4),
    );
    if (!goal) return [];
    const forestSites = ctx.obs.resources.filter(
      ({ type }) => type === 'forest',
    );
    for (const worker of idleWorkers(ctx)) {
      if (worker.buildPoints <= 0 || ctx.threatAt(worker) > 0) continue;
      for (const cell of around(worker)) {
        if (ctx.known(cell.x, cell.y) !== 'forest') continue;
        if (!ctx.obs.visible[cell.y]?.[cell.x] || ctx.occupied(cell.x, cell.y))
          continue;
        if (forestSites.length <= 1) continue;
        const start = standCells(ctx, base)[0];
        if (!start) continue;
        const before = pathCost(ctx, start, goal);
        const after = pathCost(ctx, start, goal, cell);
        if (before - after < ctx.config.clearingGain) continue;
        return [
          {
            ruleId: 'X01',
            group: 'economy',
            actorId: worker.id,
            action: { type: 'clearForest', workerId: worker.id, ...cell },
            score: 35,
            reason: `расчистка сокращает путь на ${before === Infinity ? 'непроходимый' : before - after}`,
            basis: { x: cell.x, y: cell.y },
          },
        ];
      }
    }
    return [];
  },
};
