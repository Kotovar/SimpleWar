import type { Position } from '@shared/config';

/**
 * Известная участнику карта для проверки проходов. Юниты стенами
 * не считаются: они уходят, а здание остаётся.
 */
export type AccessMap = {
  width: number;
  height: number;
  /** Можно ли пройти по известным сведениям; неразведанное — можно. */
  passable: (x: number, y: number) => boolean;
  /** Граница разведки или подход к известному врагу: связь с ней нужна базе. */
  isFrontier: (x: number, y: number) => boolean;
  /** Свои здания, кроме ратуши. */
  buildings: Position[];
  /** Своя ратуша; `null` — её нет. */
  base: Position | null;
};

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Номера связных областей по четырём направлениям; `-1` — стена. */
const label = (map: AccessMap, wall: Position | null) => {
  const { width, height } = map;
  const ids = new Int32Array(width * height).fill(-1);
  const open = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    !(wall && wall.x === x && wall.y === y) &&
    map.passable(x, y);

  let next = 0;
  for (let start = 0; start < ids.length; start++) {
    const sx = start % width;
    const sy = (start - sx) / width;
    if (ids[start] !== -1 || !open(sx, sy)) continue;
    const queue = [start];
    ids[start] = next;
    while (queue.length) {
      const key = queue.pop()!;
      const x = key % width;
      const y = (key - x) / width;
      for (const [dx, dy] of STEPS) {
        const nx = x + dx;
        const ny = y + dy;
        const nk = ny * width + nx;
        if (open(nx, ny) && ids[nk] === -1) {
          ids[nk] = next;
          queue.push(nk);
        }
      }
    }
    next++;
  }
  return ids;
};

/** Области вокруг здания (8 соседей): через них выходят новобранцы и рабочие. */
const around = (
  ids: Int32Array,
  width: number,
  height: number,
  p: Position,
) => {
  const result = new Set<number>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = p.x + dx;
      const y = p.y + dy;
      if ((dx || dy) && x >= 0 && y >= 0 && x < width && y < height) {
        const id = ids[y * width + x];
        if (id !== -1) result.add(id);
      }
    }
  }
  return result;
};

const intersects = (a: Set<number>, b: Set<number>) =>
  [...a].some(id => b.has(id));

/**
 * Перекроет ли здание на клетке последний известный проход. Запрещено,
 * если после постройки у своего здания (или у нового) не останется
 * свободного подхода, здание потеряет связь с ратушей, которая была,
 * или ратуша потеряет связь с границей разведки и известным врагом.
 *
 * @param map - Известная участнику карта.
 * @param placement - Клетка нового здания.
 * @returns `true`, если постройка перекрывает проход.
 */
export const blocksLastPassage = (map: AccessMap, placement: Position) => {
  const { width, height } = map;
  const before = label(map, null);
  const after = label(map, placement);
  const near = (ids: Int32Array, p: Position) => around(ids, width, height, p);

  const all = [...map.buildings, placement, ...(map.base ? [map.base] : [])];
  if (all.some(p => near(after, p).size === 0)) return true;
  if (!map.base) return false;

  const baseBefore = near(before, map.base);
  const baseAfter = near(after, map.base);
  for (const building of map.buildings) {
    const wasLinked = intersects(near(before, building), baseBefore);
    if (wasLinked && !intersects(near(after, building), baseAfter)) {
      return true;
    }
  }

  const frontier = (ids: Int32Array) => {
    const result = new Set<number>();
    ids.forEach((id, key) => {
      const x = key % width;
      if (id !== -1 && map.isFrontier(x, (key - x) / width)) result.add(id);
    });
    return result;
  };
  return (
    intersects(baseBefore, frontier(before)) &&
    !intersects(baseAfter, frontier(after))
  );
};
