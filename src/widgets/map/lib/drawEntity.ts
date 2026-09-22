import { TEAM_MARKERS, type Owner } from '@shared/config';

// Общая система координат 32×32: масштабируются и модель, и толщина контура.
export const beginEntity = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number,
) => {
  ctx.save();
  ctx.translate((cellX + 0.5) * cellSize, (cellY + 0.5) * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.translate(-16, -16);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.2;

  const team = TEAM_MARKERS[owner];
  ctx.save();
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = team.background;
  ctx.strokeStyle = team.color;
  ctx.beginPath();
  ctx.roundRect(2, 5, 28, 25, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = team.color;
  ctx.beginPath();
  ctx.roundRect(9, 26, 14, 4, 2);
  ctx.fill();
  ctx.fillStyle = '#fff8e6';
  ctx.font = 'bold 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(team.symbol, 16, 28.3);

  ctx.translate(16, 16);
  ctx.scale(scale, scale);
  ctx.translate(-16, -16);
  ctx.strokeStyle = '#292c30';
};

export const rect = (
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
};

/** Вымпел стороны: цветной флажок на крупных постройках. */
export const banner = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  height = 10,
) => {
  rect(ctx, '#8d7a63', x - 0.6, y, 1.6, height);
  shape(ctx, color, [x + 1, y, x + 8, y + 2.5, x + 1, y + 5]);
};

export const shape = (
  ctx: CanvasRenderingContext2D,
  color: string,
  points: readonly number[],
) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) {
    ctx.lineTo(points[i], points[i + 1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};
