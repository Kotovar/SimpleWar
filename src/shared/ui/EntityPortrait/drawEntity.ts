import { TEAM_MARKERS, type Owner } from '@shared/config';

/**
 * Подготавливает холст для отрисовки сущности в координатах 32×32.
 * Вызывающий код завершает рисунок через `ctx.restore()`.
 *
 * @param ctx - Контекст холста.
 * @param cellX - Столбец клетки.
 * @param cellY - Строка клетки.
 * @param cellSize - Размер клетки в пикселях.
 * @param owner - Сторона, определяющая цвет и форму маркера.
 * @param scale - Масштаб силуэта внутри клетки.
 */
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

  // Постамент в цвете стороны: принадлежность читается по силуэту снизу,
  // а форма маркера дублирует цвет.
  const team = TEAM_MARKERS[owner];
  ctx.fillStyle = 'rgba(16, 26, 22, 0.35)';
  ctx.beginPath();
  ctx.ellipse(16.5, 27.2, 13, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = team.background;
  ctx.strokeStyle = team.color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(16, 26.2, 12, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#1c2420';
  ctx.fillStyle = team.color;
  ctx.beginPath();
  if (team.marker === 'circle') {
    ctx.arc(16, 29.6, 1.8, 0, Math.PI * 2);
  } else if (team.marker === 'square') {
    ctx.rect(14.3, 27.9, 3.4, 3.4);
  } else if (team.marker === 'triangle') {
    ctx.moveTo(16, 27.6);
    ctx.lineTo(18.2, 31.4);
    ctx.lineTo(13.8, 31.4);
    ctx.closePath();
  } else {
    ctx.moveTo(16, 27.6);
    ctx.lineTo(18, 29.6);
    ctx.lineTo(16, 31.6);
    ctx.lineTo(14, 29.6);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.2;

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

export const circle = (
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  radius: number,
) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

/**
 * Рисует многоугольник по последовательным парам координат.
 *
 * @param ctx - Контекст холста.
 * @param color - Цвет заливки.
 * @param points - Координаты вершин в формате `[x, y, ...]`.
 */
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

export const STONE = '#c3cbc6';
export const STONE_LIGHT = '#dfe3d8';
export const STONE_DARK = '#9aa5a3';
export const TIMBER = '#a87945';
export const OPENING = '#2c3338';

/** Тень правой грани: у всех построек свет падает слева, как у рельефа. */
export const sideShadow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  ctx.fillStyle = 'rgba(20, 28, 34, 0.18)';
  ctx.fillRect(x, y, width, height);
};
