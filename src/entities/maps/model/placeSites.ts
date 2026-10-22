import {
  CACHE_REWARDS,
  CAMP_HIRES,
  SITE_COUNTS,
  SITE_MIN_START_DISTANCE,
  type Cell,
  type Site,
  type StartPosition,
} from '@shared/config';
import { findCheapestPaths, getMoveCost } from '@shared/lib';
import { createRandom } from './createRandom';

/** Нейтральные находки после подготовки стартов; `null` — не хватило доступных мест. */
export const placeSites = (
  grid: Cell[][],
  starts: readonly StartPosition[],
  seed: number,
): Site[] | null => {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!width || starts.length < 2) return null;
  const key = ({ x, y }: { x: number; y: number }) => y * width + x;
  const movement = grid.map(row => row.map(getMoveCost));
  for (const { base } of starts) movement[base.y][base.x] = 0;
  const { cost } = findCheapestPaths(movement, starts[0].worker);
  const random = createRandom(seed);
  const cells = grid
    .flat()
    .filter(
      cell =>
        cell.type === 'grass' &&
        cell.isWalkable &&
        cost.has(key(cell)) &&
        starts.every(
          ({ base }) =>
            Math.abs(cell.x - base.x) + Math.abs(cell.y - base.y) >=
            SITE_MIN_START_DISTANCE,
        ),
    )
    .map(cell => ({ cell, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ cell }) => cell);
  const available = new Set(cells.map(key));
  const centerDistance = ({ x, y }: Cell) =>
    Math.abs(x - (width - 1) / 2) + Math.abs(y - (height - 1) / 2);
  const camp = [...cells].sort(
    (a, b) => centerDistance(a) - centerDistance(b),
  )[0];
  if (!camp) return null;
  const sites: Site[] = [
    {
      id: `site_camp_${camp.x}_${camp.y}`,
      type: 'camp',
      x: camp.x,
      y: camp.y,
      hiresLeft: CAMP_HIRES,
    },
  ];
  const occupied = new Set([key(camp)]);
  const groups = cells.flatMap(cell => {
    const { x, y } = cell;
    const positions = [cell, grid[height - 1 - y][width - 1 - x]];
    if (starts.length > 2)
      positions.push(grid[y][width - 1 - x], grid[height - 1 - y][x]);
    const group = [
      ...new Map(positions.map(cell => [key(cell), cell])).values(),
    ];
    return key(cell) === Math.min(...group.map(key)) &&
      group.every(cell => available.has(key(cell)))
      ? [group]
      : [];
  });

  for (const [type, perSide] of Object.entries(SITE_COUNTS) as [
    keyof typeof SITE_COUNTS,
    number,
  ][]) {
    const candidates = [...groups];
    if (type === 'ruins')
      candidates.sort((a, b) => centerDistance(a[0]) - centerDistance(b[0]));
    if (type === 'obelisk') {
      const distance = (cell: Cell) =>
        Math.min(
          ...starts.map(
            ({ base }) => Math.abs(cell.x - base.x) + Math.abs(cell.y - base.y),
          ),
        );
      candidates.sort((a, b) => distance(b[0]) - distance(a[0]));
    }
    const count = Math.max(1, Math.round((perSide * width * height) / 900));
    for (let i = 0; i < count; i++) {
      const group = candidates.find(group =>
        group.every(cell => !occupied.has(key(cell))),
      );
      if (!group) return null;
      const resource = random() < 0.5 ? 'gold' : 'wood';
      const [min, max] = CACHE_REWARDS[resource];
      const amount = min + Math.floor(random() * (max - min + 1));
      for (const { x, y } of group) {
        occupied.add(y * width + x);
        const position = { id: `site_${type}_${x}_${y}`, x, y };
        sites.push(
          type === 'cache'
            ? { ...position, type, resource, amount }
            : { ...position, type },
        );
      }
    }
  }
  return sites;
};
