import type { Position } from '@shared/config';

/** Опасность разведки: дальность видимого бойца/известного здания плюс 2 клетки. */
export const createExplorationDanger = (
  width: number,
  height: number,
  sources: (Position & { range: number })[],
) => {
  const danger = new Uint8Array(width * height);
  for (const source of sources) {
    const range = source.range + 2;
    for (let dy = -range; dy <= range; dy++) {
      const span = range - Math.abs(dy);
      for (let dx = -span; dx <= span; dx++) {
        const x = source.x + dx;
        const y = source.y + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const key = y * width + x;
        danger[key] = Math.max(danger[key], span - Math.abs(dx) + 1);
      }
    }
  }
  return danger;
};
