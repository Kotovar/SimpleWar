import {
  HILL_SIGHT_BONUS,
  type Cell,
  type Owner,
  type Position,
} from '@shared/config';

/** Объект, дающий обзор: позиция, владелец и радиус из конфигурации типа. */
export type Viewer = Position & { owner: Owner; sightRange: number };

/** Источник обзора с итоговым радиусом. */
export type SightSource = Position & { radius: number };

/**
 * Итоговый радиус обзора: наземный объект на холме видит дальше.
 * Бонус одинаков для всех сторон и зависит только от клетки источника.
 *
 * @param viewer - Юнит или здание.
 * @param grid - Клетки карты.
 */
export const getSightRadius = (viewer: Viewer, grid: Cell[][]) =>
  viewer.sightRange +
  (grid[viewer.y]?.[viewer.x]?.type === 'hill' ? HILL_SIGHT_BONUS : 0);

/**
 * Источники обзора участника: все его живые юниты и здания.
 *
 * @param owner - Участник, чей обзор считаем.
 * @param viewers - Все юниты и здания мира.
 * @param grid - Клетки карты.
 */
export const getSightSources = (
  owner: Owner,
  viewers: Iterable<Viewer>,
  grid: Cell[][],
): SightSource[] => {
  const sources: SightSource[] = [];
  for (const viewer of viewers) {
    if (viewer.owner !== owner) continue;
    sources.push({
      x: viewer.x,
      y: viewer.y,
      radius: getSightRadius(viewer, grid),
    });
  }
  return sources;
};

/**
 * Видна ли клетка хотя бы одному источнику. Рельеф обзор не закрывает.
 *
 * @returns `true`, если клетка в ромбе Manhattan любого источника.
 */
export const isCellVisible = (sources: SightSource[], x: number, y: number) =>
  sources.some(
    source => Math.abs(source.x - x) + Math.abs(source.y - y) <= source.radius,
  );

/**
 * Маска видимых клеток: объединение ромбов всех источников.
 *
 * @param width - Ширина мира в клетках.
 * @param height - Высота мира в клетках.
 * @param sources - Источники обзора участника.
 * @returns `1` — клетка видна, индекс `y * width + x`.
 */
export const computeVisibility = (
  width: number,
  height: number,
  sources: SightSource[],
) => {
  const mask = new Uint8Array(width * height);

  for (const { x, y, radius } of sources) {
    for (let dy = -radius; dy <= radius; dy++) {
      const row = y + dy;
      if (row < 0 || row >= height) continue;
      const span = radius - Math.abs(dy);
      const from = Math.max(0, x - span);
      const to = Math.min(width - 1, x + span);
      if (from <= to) mask.fill(1, row * width + from, row * width + to + 1);
    }
  }

  return mask;
};
