import {
  FOG,
  MINIMAP_TERRAIN,
  TEAM_MARKERS,
  type Cell,
  type Owner,
} from '@shared/config';
import type { MinimapLayout } from '@shared/lib';
import type { ParticipantKnowledge } from '@entities/perceptions';
import type { Scene } from './buildScene';

/** Переносит начало координат в угол карты и масштабирует клетку. */
const toWorld = (ctx: CanvasRenderingContext2D, layout: MinimapLayout) => {
  ctx.translate(layout.offsetX, layout.offsetY);
  ctx.scale(layout.scale, layout.scale);
};

/**
 * Рельеф мини-карты: известная местность, неразведанное закрыто.
 * Рисуется только при смене карты или разведанных клеток.
 *
 * @param ctx - Контекст в CSS-пикселях мини-карты.
 * @param grid - Местность сцены.
 * @param layout - Размещение мира в мини-карте.
 * @param knowledge - Знания смотрящего; `null` — полный обзор.
 */
export const renderMinimapTerrain = (
  ctx: CanvasRenderingContext2D,
  grid: Cell[][],
  layout: MinimapLayout,
  knowledge: Pick<ParticipantKnowledge, 'width' | 'terrain'> | null,
) => {
  ctx.save();
  toWorld(ctx, layout);
  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      const known = !knowledge || knowledge.terrain[y * knowledge.width + x];
      ctx.fillStyle = known ? MINIMAP_TERRAIN[cell.type] : FOG.unknown;
      // Перекрытие на долю клетки убирает щели при дробном масштабе.
      ctx.fillRect(x, y, 1.02, 1.02);
    }),
  );
  ctx.restore();
};

const mark = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  owner: Owner,
  size: number,
  hollow = false,
) => {
  const inset = (1 - size) / 2;
  const { color } = TEAM_MARKERS[owner];
  if (hollow) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.25;
    ctx.strokeRect(x + inset, y + inset, size, size);
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x + inset, y + inset, size, size);
};

/**
 * Отметки мини-карты: затемнение вне обзора, объекты сцены, снимки
 * зданий и рамка камеры. Скрытые объекты в сцену не попадают.
 *
 * @param ctx - Контекст в CSS-пикселях мини-карты.
 * @param scene - Разрешённые смотрящему объекты и знания.
 * @param layout - Размещение мира в мини-карте.
 * @param frame - Рамка окна основной карты в CSS-пикселях мини-карты.
 */
export const renderMinimapMarks = (
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  layout: MinimapLayout,
  frame: { x: number; y: number; width: number; height: number },
) => {
  const { fog } = scene;
  ctx.save();
  toWorld(ctx, layout);

  if (fog) {
    ctx.fillStyle = FOG.explored;
    for (let y = 0; y < fog.height; y++) {
      let x = 0;
      while (x < fog.width) {
        const index = y * fog.width + x;
        if (fog.visible[index] || !fog.terrain[index]) {
          x++;
          continue;
        }
        let end = x + 1;
        while (
          end < fog.width &&
          !fog.visible[y * fog.width + end] &&
          fog.terrain[y * fog.width + end]
        ) {
          end++;
        }
        ctx.fillRect(x, y, end - x, 1);
        x = end;
      }
    }
  }

  // На мелкой мини-карте отметка не меньше двух CSS-пикселей.
  const minimum = 2 / layout.scale;
  for (const snapshot of scene.snapshots) {
    mark(
      ctx,
      snapshot.x,
      snapshot.y,
      snapshot.owner,
      Math.max(0.9, minimum),
      true,
    );
  }
  for (const building of Object.values(scene.buildings)) {
    mark(ctx, building.x, building.y, building.owner, Math.max(1, minimum));
  }
  for (const unit of Object.values(scene.units)) {
    mark(ctx, unit.x, unit.y, unit.owner, Math.max(0.7, minimum));
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    frame.x + 0.75,
    frame.y + 0.75,
    frame.width - 1.5,
    frame.height - 1.5,
  );
  ctx.restore();
};
