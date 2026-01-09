import { Owner, BUILDINGS_PALETTES } from '@shared/config';

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.1,
) => {
  const palette = BUILDINGS_PALETTES[owner];
  const baseX = cellX * cellSize + (cellSize * (1 - scale)) / 2;
  const baseY = cellY * cellSize + (cellSize * (1 - scale)) / 2;

  const s = cellSize * scale;

  // Основные стены (серый камень)
  ctx.fillStyle = palette.wall;
  ctx.fillRect(baseX + 0.18 * s, baseY + 0.42 * s, 0.64 * s, 0.35 * s);

  // Зубцы на стенах
  ctx.fillStyle = palette.wall;
  const toothWidth = 0.08 * s;
  const toothHeight = 0.08 * s;
  const toothGap = 0.08 * s;
  let toothX = baseX + 0.18 * s;
  while (toothX < baseX + 0.82 * s) {
    ctx.fillRect(toothX, baseY + 0.34 * s, toothWidth, toothHeight);
    toothX += toothWidth + toothGap;
  }

  // Угловые башни
  ctx.fillRect(baseX + 0.12 * s, baseY + 0.35 * s, 0.12 * s, 0.42 * s);
  ctx.fillRect(baseX + 0.76 * s, baseY + 0.35 * s, 0.12 * s, 0.42 * s);

  // Зубцы на башнях
  ctx.fillRect(baseX + 0.07 * s, baseY + 0.27 * s, toothWidth, toothHeight);
  ctx.fillRect(
    baseX + 0.16 * s + toothGap,
    baseY + 0.27 * s,
    toothWidth,
    toothHeight,
  );
  ctx.fillRect(baseX + 0.72 * s, baseY + 0.27 * s, toothWidth, toothHeight);
  ctx.fillRect(
    baseX + 0.77 * s + toothGap,
    baseY + 0.27 * s,
    toothWidth,
    toothHeight,
  );

  ctx.fillRect(
    baseX + 0.52 * s + toothGap,
    baseY + 0.27 * s,
    toothWidth,
    toothHeight,
  );

  ctx.fillRect(
    baseX + 0.34 * s + toothGap,
    baseY + 0.27 * s,
    toothWidth,
    toothHeight,
  );

  // Окна на основных стенах
  ctx.fillStyle = palette.window;
  ctx.fillRect(baseX + 0.3 * s, baseY + 0.5 * s, 0.08 * s, 0.1 * s);
  ctx.fillRect(baseX + 0.62 * s, baseY + 0.5 * s, 0.08 * s, 0.1 * s);

  // Окна на башнях
  ctx.fillRect(baseX + 0.14 * s, baseY + 0.45 * s, 0.08 * s, 0.12 * s);
  ctx.fillRect(baseX + 0.78 * s, baseY + 0.45 * s, 0.08 * s, 0.12 * s);

  // Большая центральная дверь
  ctx.fillStyle = palette.door;
  ctx.fillRect(baseX + 0.42 * s, baseY + 0.58 * s, 0.16 * s, 0.19 * s);
};
