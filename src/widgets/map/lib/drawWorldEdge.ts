/** Цвет за краем мира; совпадает с фоном окна карты (`.MapViewport`). */
const OUTSIDE = '#0b0e12';

/**
 * Мягкий край мира: снаружи закрашено цветом фона окна со скруглёнными
 * углами мира, внутри вдоль края — тень, без резкой линии между картой
 * и пустотой.
 *
 * @param ctx - Контекст слоя с трансформацией камеры.
 * @param columns - Ширина мира в клетках.
 * @param rows - Высота мира в клетках.
 * @param cellSize - Размер клетки в CSS-пикселях.
 */
export const drawWorldEdge = (
  ctx: CanvasRenderingContext2D,
  columns: number,
  rows: number,
  cellSize: number,
) => {
  if (!columns || !rows) return;
  const width = columns * cellSize;
  const height = rows * cellSize;
  const radius = Math.min(cellSize * 0.6, 24);
  // Внешняя область: рамка шириной `pad` вокруг мира с вырезом (evenodd).
  const outside = (pad: number) => {
    ctx.beginPath();
    ctx.rect(-pad, -pad, width + pad * 2, height + pad * 2);
    ctx.roundRect(0, 0, width, height, radius);
  };

  ctx.save();
  ctx.fillStyle = OUTSIDE;
  // Тень внутрь мира: заливка снаружи, видна только её тень под вырезом.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.clip();
  // shadowBlur не масштабируется трансформацией: переводим в пиксели буфера.
  ctx.shadowBlur = cellSize * 0.5 * (ctx.getTransform().a || 1);
  ctx.shadowColor = 'rgb(5 7 10 / 0.85)';
  // Узкая рамка: размытие считается только у края, а не по всему окну.
  outside(cellSize * 2);
  ctx.fill('evenodd');
  ctx.restore();
  outside(1e5);
  ctx.fill('evenodd');
  ctx.restore();
};
