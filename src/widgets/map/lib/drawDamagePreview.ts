/**
 * Ожидаемый урон над целью под курсором: «−N», а если удар добьёт
 * цель — красная плашка; для лечения — зелёная «+N». Считается по общей формуле урона.
 *
 * @param x - Столбец цели.
 * @param y - Строка цели.
 * @param damage - Урон по формуле.
 * @param lethal - Удар уничтожит цель.
 */
export const drawDamagePreview = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  damage: number,
  lethal: boolean,
  kind: 'damage' | 'heal' = 'damage',
) => {
  const text = kind === 'heal' ? `+${damage}` : `−${damage}`;
  const size = Math.max(10, Math.round(cellSize * 0.34));
  ctx.save();
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  const width = ctx.measureText(text).width + size * 0.8;
  const height = size * 1.35;
  const cx = (x + 0.5) * cellSize;
  // У верхнего края карты плашка уходит внутрь клетки.
  const top = Math.max(1, y * cellSize - height * 0.7);

  ctx.fillStyle =
    kind === 'heal' ? '#2f6b34' : lethal ? '#b8322a' : 'rgba(28, 34, 30, 0.9)';
  ctx.strokeStyle =
    kind === 'heal'
      ? '#cfeecf'
      : lethal
        ? '#ffd9cf'
        : 'rgba(255, 190, 170, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cx - width / 2, top, width, height, height / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff4ec';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, top + height / 2 + 0.5);
  ctx.restore();
};
