import type { Position } from '@shared/config';
import { findCheapestPaths, type MovementGrid } from '@shared/lib';

/**
 * Находит самый дешёвый путь по ценам входа в клетки.
 *
 * @param firstPosition - Исходная клетка, даже если она занята юнитом.
 * @param lastPosition - Свободная целевая клетка.
 * @param costs - Цены входа в клетки.
 * @returns Клетки пути от начала до цели и его цена; пустой путь и цена
 * `Infinity`, если цель недостижима или совпадает с началом.
 */
export const getPath = (
  firstPosition: Position,
  lastPosition: Position,
  costs: MovementGrid,
) => {
  const { cost, previous, width } = findCheapestPaths(costs, firstPosition);
  const { x, y } = lastPosition;
  const isInside = Number.isInteger(x) && x >= 0 && x < width;
  const total = isInside ? cost.get(y * width + x) : undefined;
  if (!total) return { path: [], cost: Infinity };

  const path: Position[] = [];
  for (
    let key: number | undefined = y * width + x;
    key !== undefined;
    key = previous.get(key)
  ) {
    path.push({ x: key % width, y: Math.floor(key / width) });
  }
  return { path: path.reverse(), cost: total };
};
