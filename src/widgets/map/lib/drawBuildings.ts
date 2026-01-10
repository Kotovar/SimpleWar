import {
  Owner,
  BUILDING_TOWNHALL_PALETTES,
  BUILDING_MINE_PALETTES,
  BUILDING_SAWMILL_PALETTES,
} from '@shared/config';

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.1,
) => {
  const palette = BUILDING_TOWNHALL_PALETTES[owner];
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

export const drawGoldMine = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.6,
) => {
  const palette = BUILDING_MINE_PALETTES[owner];

  const baseX = cellX * cellSize + (cellSize * (1 - scale)) / 2;
  const baseY = cellY * cellSize + (cellSize * (1 - scale)) / 2;
  const s = cellSize * scale;

  // Тёмный вход
  ctx.fillStyle = palette.shadow;
  ctx.fillRect(baseX + 0.35 * s, baseY + 0.43 * s, 0.3 * s, 0.37 * s);

  // Деревянные подпорки
  ctx.fillStyle = palette.wood;
  ctx.fillRect(baseX + 0.28 * s, baseY + 0.4 * s, 0.08 * s, 0.4 * s);
  ctx.fillRect(baseX + 0.64 * s, baseY + 0.4 * s, 0.08 * s, 0.4 * s);

  // Перекладина сверху
  ctx.fillRect(baseX + 0.3 * s, baseY + 0.38 * s, 0.4 * s, 0.06 * s);

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(baseX + 0.48 * s, baseY + 0.3 * s);
  ctx.lineTo(baseX + 0.65 * s, baseY + 0.35 * s);
  ctx.lineTo(baseX + 0.48 * s, baseY + 0.4 * s);
  ctx.closePath();
  ctx.fill();

  // Золото
  ctx.fillStyle = palette.gold;
  ctx.fillRect(baseX + 0.42 * s, baseY + 0.68 * s, 0.1 * s, 0.08 * s);
  ctx.fillRect(baseX + 0.48 * s, baseY + 0.65 * s, 0.08 * s, 0.06 * s);
};

export const drawSawmill = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.2,
) => {
  const palette = BUILDING_SAWMILL_PALETTES[owner];

  const baseX = cellX * cellSize + (cellSize * (1 - scale)) / 2;
  const baseY = cellY * cellSize + (cellSize * (1 - scale)) / 2;
  const s = cellSize * scale;

  // Основание
  ctx.fillStyle = palette.wood;
  ctx.fillRect(baseX + 0.16 * s, baseY + 0.67 * s, 0.68 * s, 0.28 * s);

  // Корпус
  ctx.fillStyle = palette.wood;
  ctx.fillRect(baseX + 0.22 * s, baseY + 0.32 * s, 0.56 * s, 0.36 * s);

  // Дымоход
  ctx.fillStyle = palette.wood;
  ctx.fillRect(baseX + 0.68 * s, baseY + 0.18 * s, 0.08 * s, 0.18 * s);

  ctx.fillStyle = palette.smoke;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(baseX + 0.66 * s, baseY + 0.11 * s, 0.12 * s, 0.06 * s);
  ctx.globalAlpha = 1.0;

  // Крыша
  ctx.fillStyle = palette.roof;
  ctx.beginPath();
  ctx.moveTo(baseX + 0.15 * s, baseY + 0.32 * s);
  ctx.lineTo(baseX + 0.5 * s, baseY + 0.12 * s);
  ctx.lineTo(baseX + 0.85 * s, baseY + 0.32 * s);
  ctx.closePath();
  ctx.fill();

  // Окно
  ctx.fillStyle = palette.window;
  ctx.fillRect(baseX + 0.38 * s, baseY + 0.42 * s, 0.08 * s, 0.1 * s);

  // Дверь
  ctx.fillStyle = palette.accent;
  ctx.fillRect(baseX + 0.48 * s, baseY + 0.7 * s, 0.1 * s, 0.18 * s);
};
