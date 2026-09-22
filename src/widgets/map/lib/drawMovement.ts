import { SELECTED } from '@shared/config';

export const drawMovement = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  type: 'free' | 'enemy' | 'produce',
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = SELECTED[type];
  ctx.beginPath();
  ctx.roundRect(0.75, 0.75, 30.5, 30.5, 1.5);
  // Прицел находится поверх модели: не тонируем самого противника.
  if (type !== 'enemy') ctx.fill();
  ctx.strokeStyle = SELECTED[`${type}Outline`];
  ctx.lineWidth = 1;

  if (type === 'free') {
    ctx.lineWidth = 0.6;
    ctx.stroke();
  } else if (type === 'produce') {
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(12, 16);
    ctx.lineTo(20, 16);
    ctx.moveTo(16, 12);
    ctx.lineTo(16, 20);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.beginPath();
    for (const [x, y, dx, dy] of [
      [2, 2, 1, 1],
      [30, 2, -1, 1],
      [30, 30, -1, -1],
      [2, 30, 1, -1],
    ]) {
      ctx.moveTo(x, y + dy * 6);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 3, y);
    }
    ctx.strokeStyle = '#54332c';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.strokeStyle = SELECTED.enemyOutline;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  ctx.restore();
};
