import {
  MOVE_COST,
  type Building,
  type Position,
  type Unit,
} from '@shared/config';
import { findCheapestPaths, isBuildableTerrain } from '@shared/lib';
import type { AiRule } from '../../model/types';
import type { AiContext } from '../context';
import { isNear } from '../facts';
import { around, cellKey, chebyshev, manhattan } from '../geometry';
import { standCells, stepToward, turnMoves } from '../movement';
import { strikeGroup } from '../operation';
import { isFree, moveTo } from './common';

/** Свободные клетки вокруг здания для найма. */
const exits = (ctx: AiContext, building: Building) =>
  around(building).filter(
    cell =>
      ctx.inside(cell) &&
      isBuildableTerrain('grass', ctx.known(cell.x, cell.y) ?? 'water') &&
      !ctx.occupied(cell.x, cell.y),
  );

/** Свой юнит, способный уступить клетку: есть очки и он не в обороне. */
const canYield = (ctx: AiContext, unit: Unit) =>
  isFree(ctx, unit.id) && unit.movePoints > 0;

/** Отойти с клетки: ближайшая достижимая клетка вне запрета. */
const stepAside = (
  ctx: AiContext,
  unit: Unit,
  avoid: (cell: Position) => boolean,
) =>
  turnMoves(ctx, unit)
    .filter(cell => !avoid(cell))
    .sort((a, b) => a.cost - b.cost)[0];

/**
 * Первый свой юнит на пути застрявшего: путь строится так, будто свои
 * юниты проходимы, — только тогда видно, кто именно загородил проход.
 */
const blockerOnPath = (ctx: AiContext, unit: Unit, goal: Position) => {
  const own = new Map(
    ctx.obs.ownUnits.map(u => [cellKey(u.x, u.y, ctx.width), u]),
  );
  const grid = ctx.grid(2).map((row, y) =>
    row.map((cost, x) => {
      if (!own.has(cellKey(x, y, ctx.width))) return cost;
      const type = ctx.known(x, y);
      return type ? (MOVE_COST[type] ?? 0) + 2 : 3;
    }),
  );
  const { cost, previous, width } = findCheapestPaths(grid, unit);
  let key: number | undefined = cellKey(goal.x, goal.y, width);
  if (!cost.has(key)) return null;
  const path: number[] = [];
  while (key !== undefined) {
    path.push(key);
    key = previous.get(key);
  }
  path.reverse();
  for (const step of path.slice(1)) {
    const blocker = own.get(step);
    if (blocker) return { blocker, path: new Set(path) };
  }
  return null;
};

/**
 * W10: своя позиция мешает развитию — уступить выход производства или
 * проход застрявшей группе; если ратушу закрыли свои здания — снести
 * мешающее (не ратушу).
 */
export const W10: AiRule = {
  id: 'W10',
  group: 'build',
  title: 'Освободить проход',
  evaluate: ctx => {
    const producers = ctx.obs.ownBuildings.filter(
      (b): b is Building & { role: 'production' } => b.role === 'production',
    );
    for (const building of producers) {
      if (exits(ctx, building).length) continue;
      // Уступают стоящие рядом, а если они заперты — стоящие через клетку.
      const blocker = [...ctx.obs.ownUnits]
        .filter(unit => chebyshev(unit, building) <= 2 && canYield(ctx, unit))
        .sort((a, b) => chebyshev(a, building) - chebyshev(b, building))
        .find(unit => stepAside(ctx, unit, c => chebyshev(c, building) <= 1));
      const cell =
        blocker && stepAside(ctx, blocker, c => chebyshev(c, building) <= 1);
      if (blocker && cell) {
        return [
          moveTo('W10', blocker, cell, 45, 'уступаю выход найма', {
            group: 'build',
          }),
        ];
      }
      const wall = ctx.obs.ownBuildings.find(
        b => b.type !== 'base' && isNear(b, building) && b.type !== 'tower',
      );
      if (
        building.type === 'base' &&
        wall &&
        !ctx.obs.ownUnits.some(u => isNear(u, building))
      ) {
        return [
          {
            ruleId: 'W10',
            group: 'build',
            actorId: wall.id,
            action: { type: 'demolish', buildingId: wall.id },
            score: 35,
            reason: 'ратуша замурована своими зданиями: сношу мешающее',
          },
        ];
      }
    }

    // Застрявшая ударная группа: уступает первый свой юнит на её пути.
    const { phase, target, rally } = ctx.memory.operation;
    const goal = phase === 'gather' ? rally : target;
    if (!goal) return [];
    for (const unit of strikeGroup(ctx)) {
      if (unit.movePoints <= 0 || !isFree(ctx, unit.id)) continue;
      if (manhattan(unit, goal) <= 2) continue;
      if (stepToward(ctx, unit, [goal, ...standCells(ctx, goal)])) continue;
      const found = blockerOnPath(ctx, unit, goal);
      if (!found || !canYield(ctx, found.blocker)) continue;
      const cell = stepAside(ctx, found.blocker, c =>
        found.path.has(cellKey(c.x, c.y, ctx.width)),
      );
      if (cell) {
        return [
          moveTo('W10', found.blocker, cell, 44, 'уступаю проход группе', {
            group: 'build',
          }),
        ];
      }
    }
    return [];
  },
};
