import { useMemo } from 'react';
import type { Position } from '@shared/config';

/**
 * Клетки под зданиями в виде `"x,y"` для площадок на рельефе. Берутся только
 * видимые здания и снимки: расчистка под скрытой постройкой её не выдаёт.
 * Ключ меняется только при постройке или сносе, а не при уроне зданию,
 * поэтому рельеф не перерисовывается без нужды.
 *
 * @param sites - Видимые здания и снимки зданий.
 */
export const useBuiltCells = (sites: Position[]) => {
  const key = sites
    .map(({ x, y }) => `${x},${y}`)
    .sort()
    .join(';');
  return useMemo(() => new Set(key ? key.split(';') : []), [key]);
};
