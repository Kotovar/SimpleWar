import type { Position } from '@shared/config';

/** Ключ клетки `y * width + x`. */
export const cellKey = (x: number, y: number, width: number) => y * width + x;

/** Клетка по ключу. */
export const fromKey = (key: number, width: number): Position => ({
  x: key % width,
  y: Math.floor(key / width),
});

/** Расстояние по четырём направлениям: движение и дальность атаки. */
export const manhattan = (a: Position, b: Position) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Расстояние с диагоналями: соседство стройки, найма и добычи. */
export const chebyshev = (a: Position, b: Position) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Соседство для стройки, найма и добычи. */
export const isNear = (a: Position, b: Position) => chebyshev(a, b) === 1;

/** Ближайший к точке объект из списка. */
export const nearest = <T extends Position>(from: Position, items: T[]) =>
  [...items].sort((a, b) => manhattan(a, from) - manhattan(b, from))[0] as
    | T
    | undefined;

/** Восемь соседних клеток. */
export const around = (p: Position): Position[] => {
  const cells: Position[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) cells.push({ x: p.x + dx, y: p.y + dy });
    }
  }
  return cells;
};

/** Четыре соседние клетки. */
export const sides = (p: Position): Position[] => [
  { x: p.x + 1, y: p.y },
  { x: p.x - 1, y: p.y },
  { x: p.x, y: p.y + 1 },
  { x: p.x, y: p.y - 1 },
];

/**
 * Детерминированный хеш строки с сидом: разрешает равные оценки одинаково
 * при одинаковом наблюдении и сиде.
 *
 * @returns Число от 0 до 1.
 */
export const tieBreak = (text: string, seed: number) => {
  let hash = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d) >>> 0;
  return (hash ^ (hash >>> 12)) / 0x100000000;
};
