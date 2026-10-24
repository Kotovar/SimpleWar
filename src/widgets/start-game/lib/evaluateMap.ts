import {
  START_FAIRNESS_TOLERANCE,
  SITE_MIN_START_DISTANCE,
  SITE_TYPES,
  type Cell,
  type Site,
  type StartPosition,
} from '@shared/config';
import { findCheapestPaths, getMoveCost } from '@shared/lib';

export type { StartPosition } from '@shared/config';
export type MapRejection =
  | 'start'
  | 'exit'
  | 'route'
  | 'gold'
  | 'forest'
  | 'fairness'
  | 'sites';

/** Проверяет, может ли рабочий подойти к соседней клетке ресурса. */
export const accessibleResourceCost = (
  grid: Cell[][],
  costs: Map<number, number>,
  type: 'gold' | 'forest',
): number => {
  const width = grid[0]?.length ?? 0;

  if (width === 0) {
    return Infinity;
  }

  let minCost = Infinity;

  for (const row of grid) {
    for (const resourceCell of row) {
      if (resourceCell.type !== type) {
        continue;
      }

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const x = resourceCell.x + dx;
          const y = resourceCell.y + dy;
          const neighbor = grid[y]?.[x];

          if (!neighbor) {
            continue;
          }

          const cellIndex = y * width + x;
          const cost = costs.get(cellIndex);

          if (cost !== undefined && cost < minCost) {
            minCost = cost;
          }
        }
      }
    }
  }

  return minCost;
};

/** Оценивает уже подготовленную карту, учитывая будущую занятость ратушами. */
export const evaluateMap = (
  grid: Cell[][],
  starts: StartPosition[],
  sites?: readonly Site[],
): { ok: true } | { ok: false; reason: MapRejection } => {
  const width = grid[0]?.length ?? 0;
  const key = ({ x, y }: { x: number; y: number }) => y * width + x;
  const occupied = new Set<number>();
  if (!width || starts.length < 2) return { ok: false, reason: 'start' };
  for (const { base, worker } of starts) {
    if (
      !grid[base.y]?.[base.x]?.isWalkable ||
      !grid[worker.y]?.[worker.x]?.isWalkable ||
      !Number.isInteger(base.x) ||
      !Number.isInteger(base.y) ||
      !Number.isInteger(worker.x) ||
      !Number.isInteger(worker.y) ||
      Math.max(Math.abs(base.x - worker.x), Math.abs(base.y - worker.y)) !==
        1 ||
      occupied.has(key(base)) ||
      occupied.has(key(worker))
    )
      return { ok: false, reason: 'start' };
    occupied.add(key(base));
    occupied.add(key(worker));
  }

  const movement = grid.map(row => row.map(getMoveCost));
  for (const { base } of starts) movement[base.y][base.x] = 0;
  if (
    sites &&
    (SITE_TYPES.some(type => !sites.some(site => site.type === type)) ||
      new Set(sites.map(key)).size !== sites.length ||
      sites.some(
        site =>
          !Number.isInteger(site.x) ||
          !Number.isInteger(site.y) ||
          grid[site.y]?.[site.x]?.type !== 'grass' ||
          !grid[site.y][site.x].isWalkable ||
          starts.some(
            ({ base }) =>
              Math.abs(site.x - base.x) + Math.abs(site.y - base.y) <
              SITE_MIN_START_DISTANCE,
          ),
      ))
  )
    return { ok: false, reason: 'sites' };
  const siteDistances: number[][] = SITE_TYPES.map(() => []);
  const distances: Record<'gold' | 'forest', number[]> = {
    gold: [],
    forest: [],
  };

  for (const { base, worker } of starts) {
    const exits = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].filter(([dx, dy]) => movement[base.y + dy]?.[base.x + dx]);
    if (exits.length < 2) return { ok: false, reason: 'exit' };

    const { cost } = findCheapestPaths(movement, worker);
    if (starts.some(start => !cost.has(key(start.worker)))) {
      return { ok: false, reason: 'route' };
    }
    for (const type of ['gold', 'forest'] as const) {
      const distance = accessibleResourceCost(grid, cost, type);
      if (!Number.isFinite(distance)) return { ok: false, reason: type };
      distances[type].push(distance);
    }
    if (sites) {
      if (sites.some(site => !cost.has(key(site))))
        return { ok: false, reason: 'sites' };
      SITE_TYPES.forEach((type, index) => {
        siteDistances[index].push(
          Math.min(
            ...sites
              .filter(site => site.type === type)
              .map(site => cost.get(key(site))!),
          ),
        );
      });
    }
  }

  if (
    (['gold', 'forest'] as const).some(
      type =>
        Math.max(...distances[type]) - Math.min(...distances[type]) >
        START_FAIRNESS_TOLERANCE,
    )
  )
    return { ok: false, reason: 'fairness' };

  if (
    sites &&
    siteDistances.some(
      distances =>
        Math.max(...distances) - Math.min(...distances) >
        START_FAIRNESS_TOLERANCE,
    )
  )
    return { ok: false, reason: 'sites' };
  return { ok: true };
};
