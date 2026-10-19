import { BUILDINGS_CONFIG, FOG, type BuildingType } from '@shared/config';
import type { CellRange } from '@shared/lib';
import type { Contact } from '@entities/perceptions';
import { drawBuildingModel } from './renderEntitiesLayer';

const isBuildingType = (type: string): type is BuildingType =>
  type in BUILDINGS_CONFIG;

/**
 * Рисует запомненные здания вне обзора как устаревший снимок: модель
 * с отметкой «?» и без полосы здоровья. Живое состояние здания не читается.
 *
 * @param ctx - Контекст слоя объектов.
 * @param snapshots - Контакты-здания из памяти смотрящего участника.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @param range - Клетки в окне камеры; без него рисуются все.
 */
export const renderSnapshots = (
  ctx: CanvasRenderingContext2D,
  snapshots: Contact[],
  cellSize: number,
  range?: CellRange,
) => {
  for (const { type, x, y, owner, kind } of snapshots) {
    if (kind !== 'building') continue;
    if (
      range &&
      (x < range.x0 || x >= range.x1 || y < range.y0 || y >= range.y1)
    ) {
      continue;
    }
    // Снимки бывают только у зданий.
    if (!isBuildingType(type)) continue;

    drawBuildingModel(ctx, type, x, y, cellSize, owner);

    const radius = cellSize * 0.17;
    const cx = (x + 1) * cellSize - radius * 1.2;
    const cy = y * cellSize + radius * 1.2;
    ctx.save();
    ctx.fillStyle = FOG.snapshotMarkBackground;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = FOG.snapshotMark;
    ctx.font = `700 ${Math.round(radius * 1.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy + radius * 0.08);
    ctx.restore();
  }
};
