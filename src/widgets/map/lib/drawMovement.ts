import { SELECTED, type Position } from '@shared/config';

export const drawMovement = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  type: 'free' | 'enemy' | 'produce',
  /** Фаза пульсации цели атаки от 0 до 1. */
  pulse = 0,
) => {
  ctx.save();
  ctx.translate(cellX * cellSize, cellY * cellSize);
  ctx.scale(cellSize / 32, cellSize / 32);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'free') {
    // Заливка без зазоров: соседние клетки складываются в одну зону,
    // её границу рисует `drawZoneOutline`.
    ctx.fillStyle = SELECTED.free;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'rgba(226, 244, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(16, 16, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'produce') {
    ctx.fillStyle = SELECTED.produce;
    ctx.fillRect(0, 0, 32, 32);
    ctx.beginPath();
    ctx.moveTo(12, 16);
    ctx.lineTo(20, 16);
    ctx.moveTo(16, 12);
    ctx.lineTo(16, 20);
    ctx.strokeStyle = SELECTED.outlineShadow;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = SELECTED.produceOutline;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // Прицел находится поверх модели: не тонируем самого противника.
    // Уголки прицела «сжимаются» к цели и подсвечиваются в такт пульсу.
    const near = 2 + pulse * 1.6;
    const far = 32 - near;
    ctx.beginPath();
    for (const [x, y, dx, dy] of [
      [near, near, 1, 1],
      [far, near, -1, 1],
      [far, far, -1, -1],
      [near, far, 1, -1],
    ]) {
      ctx.moveTo(x, y + dy * 7);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * 7, y);
    }
    ctx.strokeStyle = '#54332c';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = SELECTED.enemyOutline;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = `rgba(255, 150, 120, ${0.9 * pulse})`;
    ctx.shadowBlur = ctx.getTransform().a * 5 * pulse;
    ctx.stroke();
  }
  ctx.restore();
};

/**
 * Обводит внешнюю границу набора клеток.
 *
 * Внутренние рёбра между соседними клетками зоны не рисуются: игрок видит
 * одну область досягаемости, а не сетку отдельных квадратов.
 */
export const drawZoneOutline = (
  ctx: CanvasRenderingContext2D,
  cells: Position[],
  cellSize: number,
  color: string,
) => {
  const keys = new Set(cells.map(({ x, y }) => `${x},${y}`));
  const has = (x: number, y: number) => keys.has(`${x},${y}`);

  const scale = cellSize / 32;
  // На краю карты половина линии ушла бы за холст: такие рёбра сдвигаем внутрь.
  const inset = 1.5 * scale;
  const ratio = ctx.getTransform().a || 1;
  const maxX = ctx.canvas.width / ratio;
  const maxY = ctx.canvas.height / ratio;
  const clampX = (value: number) =>
    Math.min(Math.max(value, inset), maxX - inset);
  const clampY = (value: number) =>
    Math.min(Math.max(value, inset), maxY - inset);

  ctx.save();
  ctx.beginPath();
  for (const { x, y } of cells) {
    const left = clampX(x * cellSize);
    const top = clampY(y * cellSize);
    const right = clampX((x + 1) * cellSize);
    const bottom = clampY((y + 1) * cellSize);
    if (!has(x, y - 1)) {
      ctx.moveTo(left, top);
      ctx.lineTo(right, top);
    }
    if (!has(x + 1, y)) {
      ctx.moveTo(right, top);
      ctx.lineTo(right, bottom);
    }
    if (!has(x, y + 1)) {
      ctx.moveTo(left, bottom);
      ctx.lineTo(right, bottom);
    }
    if (!has(x - 1, y)) {
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
    }
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = SELECTED.outlineShadow;
  ctx.lineWidth = 3 * scale;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();
  ctx.restore();
};
