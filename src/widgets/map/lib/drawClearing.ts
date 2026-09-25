import type { CellType } from '@shared/config';
import { circle, shape } from '@shared/ui';
import { sample } from '@shared/lib';

/** Пень в координатах клетки 32×32. */
const stump = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  shape(ctx, '#7a5a3a', [
    x - 2.2,
    y,
    x - 2,
    y - 2.4,
    x + 2,
    y - 2.4,
    x + 2.2,
    y,
  ]);
  ctx.fillStyle = '#d9b27a';
  ctx.beginPath();
  ctx.ellipse(x, y - 2.4, 2, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

/** Отвал породы с самородком. */
const rubble = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  shape(ctx, '#8b918c', [
    x - 3,
    y,
    x - 1.5,
    y - 2.6,
    x + 1.8,
    y - 2.2,
    x + 3,
    y,
  ]);
  circle(ctx, '#f5cd53', x + 0.4, y - 1, 0.9);
};

/**
 * Расчищенная площадка под зданием на лесной или золотой клетке.
 *
 * Деревья и жила под постройкой не рисуются: иначе они выглядывают из-за
 * модели. Вместо них — утоптанная земля и следы работы по краям клетки,
 * так что тип клетки по-прежнему читается.
 */
export const drawClearing = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  type: CellType,
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = '#292c30';

  // Утоптанная земля под постройкой.
  const ground = ctx.createRadialGradient(16, 20, 2, 16, 20, 15);
  ground.addColorStop(0, type === 'gold' ? '#a58f64' : '#8c7650');
  ground.addColorStop(
    0.75,
    type === 'gold' ? 'rgba(165, 143, 100, 0.8)' : 'rgba(140, 118, 80, 0.75)',
  );
  ground.addColorStop(1, 'rgba(140, 118, 80, 0)');
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.ellipse(16, 20, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  // Следы работы в углах, которые модель здания не закрывает.
  const flip = sample(cellX, cellY, 733) > 0.5;
  const spots: [number, number][] = flip
    ? [
        [4, 8],
        [28.5, 12],
      ]
    : [
        [27.5, 7.5],
        [4.5, 13],
      ];

  if (type === 'forest') {
    spots.forEach(([x, y]) => stump(ctx, x, y));
    // Опилки у лесопилки.
    ctx.fillStyle = 'rgba(232, 200, 140, 0.7)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(
        6 + sample(cellX, cellY, 740 + i) * 20,
        27 + sample(cellX, cellY, 760 + i) * 3,
        0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (type === 'gold') {
    spots.forEach(([x, y]) => rubble(ctx, x, y));
  }

  ctx.restore();
};
