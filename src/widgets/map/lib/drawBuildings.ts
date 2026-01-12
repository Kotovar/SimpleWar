import {
  Owner,
  BUILDING_TOWNHALL_PALETTES,
  BUILDING_MINE_PALETTES,
  BUILDING_SAWMILL_PALETTES,
  BUILDING_FARM_PALETTES,
  BUILDING_BARRACKS_PALETTES,
} from '@shared/config';
import { getBuildingBase } from './getBuildingBase';

export const drawBase = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.1,
) => {
  const palette = BUILDING_TOWNHALL_PALETTES[owner];
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // Основные стены (серый камень)
  ctx.fillStyle = palette.wall;
  ctx.fillRect(
    baseX + 0.18 * unit,
    baseY + 0.42 * unit,
    0.64 * unit,
    0.35 * unit,
  );

  // Зубцы на стенах
  ctx.fillStyle = palette.wall;
  const toothWidth = 0.08 * unit;
  const toothHeight = 0.08 * unit;
  const toothGap = 0.08 * unit;
  let toothX = baseX + 0.18 * unit;
  while (toothX < baseX + 0.82 * unit) {
    ctx.fillRect(toothX, baseY + 0.34 * unit, toothWidth, toothHeight);
    toothX += toothWidth + toothGap;
  }

  // Угловые башни
  ctx.fillRect(
    baseX + 0.12 * unit,
    baseY + 0.35 * unit,
    0.12 * unit,
    0.42 * unit,
  );
  ctx.fillRect(
    baseX + 0.76 * unit,
    baseY + 0.35 * unit,
    0.12 * unit,
    0.42 * unit,
  );

  // Зубцы на башнях
  ctx.fillRect(
    baseX + 0.07 * unit,
    baseY + 0.27 * unit,
    toothWidth,
    toothHeight,
  );
  ctx.fillRect(
    baseX + 0.16 * unit + toothGap,
    baseY + 0.27 * unit,
    toothWidth,
    toothHeight,
  );
  ctx.fillRect(
    baseX + 0.72 * unit,
    baseY + 0.27 * unit,
    toothWidth,
    toothHeight,
  );
  ctx.fillRect(
    baseX + 0.77 * unit + toothGap,
    baseY + 0.27 * unit,
    toothWidth,
    toothHeight,
  );

  ctx.fillRect(
    baseX + 0.52 * unit + toothGap,
    baseY + 0.27 * unit,
    toothWidth,
    toothHeight,
  );

  ctx.fillRect(
    baseX + 0.34 * unit + toothGap,
    baseY + 0.27 * unit,
    toothWidth,
    toothHeight,
  );

  // Окна на основных стенах
  ctx.fillStyle = palette.window;
  ctx.fillRect(baseX + 0.3 * unit, baseY + 0.5 * unit, 0.08 * unit, 0.1 * unit);
  ctx.fillRect(
    baseX + 0.62 * unit,
    baseY + 0.5 * unit,
    0.08 * unit,
    0.1 * unit,
  );

  // Окна на башнях
  ctx.fillRect(
    baseX + 0.14 * unit,
    baseY + 0.45 * unit,
    0.08 * unit,
    0.12 * unit,
  );
  ctx.fillRect(
    baseX + 0.78 * unit,
    baseY + 0.45 * unit,
    0.08 * unit,
    0.12 * unit,
  );

  // Большая центральная дверь
  ctx.fillStyle = palette.door;
  ctx.fillRect(
    baseX + 0.42 * unit,
    baseY + 0.58 * unit,
    0.16 * unit,
    0.19 * unit,
  );
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
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // Тёмный вход
  ctx.fillStyle = palette.shadow;
  ctx.fillRect(
    baseX + 0.35 * unit,
    baseY + 0.43 * unit,
    0.3 * unit,
    0.37 * unit,
  );

  // Деревянные подпорки
  ctx.fillStyle = palette.wood;
  ctx.fillRect(
    baseX + 0.28 * unit,
    baseY + 0.4 * unit,
    0.08 * unit,
    0.4 * unit,
  );
  ctx.fillRect(
    baseX + 0.64 * unit,
    baseY + 0.4 * unit,
    0.08 * unit,
    0.4 * unit,
  );

  // Перекладина сверху
  ctx.fillRect(
    baseX + 0.3 * unit,
    baseY + 0.38 * unit,
    0.4 * unit,
    0.06 * unit,
  );

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(baseX + 0.48 * unit, baseY + 0.3 * unit);
  ctx.lineTo(baseX + 0.65 * unit, baseY + 0.35 * unit);
  ctx.lineTo(baseX + 0.48 * unit, baseY + 0.4 * unit);
  ctx.closePath();
  ctx.fill();

  // Золото
  ctx.fillStyle = palette.gold;
  ctx.fillRect(
    baseX + 0.42 * unit,
    baseY + 0.68 * unit,
    0.1 * unit,
    0.08 * unit,
  );
  ctx.fillRect(
    baseX + 0.48 * unit,
    baseY + 0.65 * unit,
    0.08 * unit,
    0.06 * unit,
  );
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
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // Основание
  ctx.fillStyle = palette.wood;
  ctx.fillRect(
    baseX + 0.16 * unit,
    baseY + 0.67 * unit,
    0.68 * unit,
    0.28 * unit,
  );

  // Корпус
  ctx.fillStyle = palette.wood;
  ctx.fillRect(
    baseX + 0.22 * unit,
    baseY + 0.32 * unit,
    0.56 * unit,
    0.36 * unit,
  );

  // Дымоход
  ctx.fillStyle = palette.wood;
  ctx.fillRect(
    baseX + 0.68 * unit,
    baseY + 0.18 * unit,
    0.08 * unit,
    0.18 * unit,
  );

  ctx.fillStyle = palette.smoke;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(
    baseX + 0.66 * unit,
    baseY + 0.11 * unit,
    0.12 * unit,
    0.06 * unit,
  );
  ctx.globalAlpha = 1.0;

  // Крыша
  ctx.fillStyle = palette.roof;
  ctx.beginPath();
  ctx.moveTo(baseX + 0.15 * unit, baseY + 0.32 * unit);
  ctx.lineTo(baseX + 0.5 * unit, baseY + 0.12 * unit);
  ctx.lineTo(baseX + 0.85 * unit, baseY + 0.32 * unit);
  ctx.closePath();
  ctx.fill();

  // Окно
  ctx.fillStyle = palette.window;
  ctx.fillRect(
    baseX + 0.38 * unit,
    baseY + 0.42 * unit,
    0.08 * unit,
    0.1 * unit,
  );

  // Дверь
  ctx.fillStyle = palette.accent;
  ctx.fillRect(
    baseX + 0.48 * unit,
    baseY + 0.7 * unit,
    0.1 * unit,
    0.18 * unit,
  );
};

export const drawFarm = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.18,
) => {
  const palette = BUILDING_FARM_PALETTES[owner];
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // Структура
  ctx.fillStyle = palette.wood;
  ctx.fillRect(
    baseX + 0.25 * unit,
    baseY + 0.32 * unit,
    0.5 * unit,
    0.4 * unit,
  );

  // Крыша
  ctx.fillStyle = palette.roof;
  ctx.beginPath();
  ctx.moveTo(baseX + 0.15 * unit, baseY + 0.32 * unit);
  ctx.lineTo(baseX + 0.5 * unit, baseY + 0.1 * unit);
  ctx.lineTo(baseX + 0.85 * unit, baseY + 0.32 * unit);
  ctx.closePath();
  ctx.fill();

  // Дверь
  ctx.fillStyle = palette.door;
  ctx.fillRect(
    baseX + 0.42 * unit,
    baseY + 0.52 * unit,
    0.16 * unit,
    0.2 * unit,
  );

  // Окно
  ctx.fillStyle = palette.window;
  ctx.fillRect(
    baseX + 0.32 * unit,
    baseY + 0.42 * unit,
    0.08 * unit,
    0.1 * unit,
  );

  // Сноп сена
  ctx.fillStyle = palette.hay;
  ctx.fillRect(
    baseX + 0.72 * unit,
    baseY + 0.65 * unit,
    0.16 * unit,
    0.14 * unit,
  );
  ctx.fillRect(
    baseX + 0.76 * unit,
    baseY + 0.6 * unit,
    0.12 * unit,
    0.1 * unit,
  );
};

export const drawBarracks = (
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  cellSize: number,
  owner: Owner,
  scale: number = 1.25,
) => {
  const palette = BUILDING_BARRACKS_PALETTES[owner];
  const { baseX, baseY, unit } = getBuildingBase(cellX, cellY, cellSize, scale);

  // Корпус
  ctx.fillStyle = palette.wall;
  ctx.fillRect(
    baseX + 0.11 * unit,
    baseY + 0.38 * unit,
    0.74 * unit,
    0.42 * unit,
  );

  // Зубцы
  ctx.fillStyle = palette.wall;
  const toothWidth = 0.07 * unit;
  const toothHeight = 0.07 * unit;
  const toothGap = 0.07 * unit;
  let toothX = baseX + 0.15 * unit;
  while (toothX < baseX + 0.85 * unit - toothWidth) {
    ctx.fillRect(toothX, baseY + 0.31 * unit, toothWidth, toothHeight);
    toothX += toothWidth + toothGap;
  }

  // Двойная дверь
  ctx.fillStyle = palette.door;
  ctx.fillRect(
    baseX + 0.39 * unit,
    baseY + 0.58 * unit,
    0.1 * unit,
    0.22 * unit,
  );
  ctx.fillRect(
    baseX + 0.51 * unit,
    baseY + 0.58 * unit,
    0.1 * unit,
    0.22 * unit,
  );

  // ─── Флаги и древки ───
  ctx.strokeStyle = palette.staff;
  ctx.fillStyle = palette.accent;
  ctx.lineWidth = 0.01 * unit;
  ctx.lineCap = 'round';

  // Левое древко + флаг
  ctx.beginPath();
  ctx.moveTo(baseX + 0.4 * unit, baseY + 0.38 * unit);
  ctx.lineTo(baseX + 0.4 * unit, baseY + 0.13 * unit);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(baseX + 0.27 * unit, baseY + 0.24 * unit);
  ctx.lineTo(baseX + 0.39 * unit, baseY + 0.14 * unit);
  ctx.lineTo(baseX + 0.39 * unit, baseY + 0.3 * unit);
  ctx.closePath();
  ctx.fill();

  // Правое древко + флаг
  ctx.beginPath();
  ctx.moveTo(baseX + 0.68 * unit, baseY + 0.38 * unit);
  ctx.lineTo(baseX + 0.68 * unit, baseY + 0.13 * unit);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(baseX + 0.53 * unit, baseY + 0.24 * unit);
  ctx.lineTo(baseX + 0.67 * unit, baseY + 0.14 * unit);
  ctx.lineTo(baseX + 0.67 * unit, baseY + 0.3 * unit);
  ctx.closePath();
  ctx.fill();

  // Окна
  ctx.fillStyle = palette.window;
  ctx.fillRect(
    baseX + 0.24 * unit,
    baseY + 0.46 * unit,
    0.06 * unit,
    0.08 * unit,
  );
  ctx.fillRect(
    baseX + 0.7 * unit,
    baseY + 0.46 * unit,
    0.06 * unit,
    0.08 * unit,
  );
};
