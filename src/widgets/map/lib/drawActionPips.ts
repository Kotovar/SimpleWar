import type { Unit } from '@shared/config';

const PIP_X = 29;
const PIP_STEP = 3.4;
const PIP_RADIUS = 1.3;

const dot = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) => {
  ctx.beginPath();
  ctx.arc(x, y, PIP_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.stroke();
};

/**
 * Рисует столбик очков юнита у правого края клетки.
 *
 * Верхние точки — оставшиеся очки движения, нижняя золотая — доступное
 * действие (атака или стройка). Видно, кем ещё можно ходить, без клика.
 */
export const drawActionPips = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  unit: Unit,
) => {
  const hasAction =
    unit.role === 'military' ? unit.attackPoints > 0 : unit.buildPoints > 0;

  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = '#1c2420';

  dot(ctx, PIP_X, 26.5, hasAction ? '#f2c744' : '#3b444d');

  for (let index = 0; index < unit.maxMovePoints; index++) {
    dot(
      ctx,
      PIP_X,
      22.5 - index * PIP_STEP,
      index < unit.movePoints ? '#d8ecff' : '#3b444d',
    );
  }

  ctx.restore();
};
