import type { Owner } from './common';

export const HP_BAR = {
  widthRatio: 0.44, // Ширина HP-бара относительно клетки
  heightRatio: 0.06, // Высота HP-бара
  yOffsetRatio: 0.12, // Отступ сверху клетки
  lineWidth: 1, // Цвет фона (пустое здоровье)
  colorRed: 'hsla(0, 100%, 50%, 1.00)', // Цвет фона (пустое здоровье)
  colorGreen: 'hsla(120, 100%, 50%, 1.00)', // Цвет заполнения (оставшееся здоровье)
  colorBorder: 'hsla(0, 0%, 0%, 1.00)', // Цвет обводки
};

type BuildingPalette = {
  wall: string;
  roof: string;
  door: string;
};

type UnitPalette = {
  body: string;
  bodyArcher: string;
  head: string;
  sword: string;
  arrowShaft: string;
  accent: string;
};

export const BUILDINGS_PALETTES: Record<Owner, BuildingPalette> = {
  player: {
    wall: 'hsla(0, 0%, 55%, 1.00)',
    roof: 'hsla(100, 42%, 24%, 1.00)',
    door: 'hsla(100, 100%, 26%, 1.00)',
  },
  ai: {
    wall: 'hsla(0, 0%, 55%, 1.00)',
    roof: 'rgba(189, 31, 31, 1)',
    door: 'hsla(0, 97%, 47%, 1.00)',
  },
};

export const UNIT_PALETTES: Record<Owner, UnitPalette> = {
  player: {
    body: 'hsla(233, 88%, 37%, 1.00)',
    bodyArcher: 'hsla(233, 70%, 52%, 1.00)',
    head: 'hsla(34, 44%, 69%, 1.00)',
    sword: 'hsla(0, 0%, 81%, 1.00)',
    arrowShaft: 'hsla(34, 57%, 70%, 1.00)',
    accent: 'hsla(220, 99%, 61%, 1.00)',
  },
  ai: {
    body: 'hsla(0, 60%, 36%, 1.00)',
    bodyArcher: 'hsla(22, 87%, 51%, 1.00)',
    head: 'hsla(19, 42%, 68%, 1.00)',
    sword: 'hsla(0, 0%, 81%, 1.00)',
    arrowShaft: 'hsla(34, 57%, 70%, 1.00)',
    accent: 'hsla(0, 68%, 42%, 1.00)',
  },
};

export const GRID = {
  lineThickness: 1,
  lineColor: 'hsla(0, 0%, 0%, 0.04)',
  colorGrass: { r: 46, g: 160, b: 55 },
  colorWater: { r: 40, g: 110, b: 180 },
};

export const SELECTED = {
  move: 'hsla(137, 100%, 50%, 0.44)',
  enemyInTarget: 'hsla(0, 100%, 50%, 0.26)',
  lineThickness: 2,
};

export const SELECTION = {
  colorOutline: 'hsla(148, 100%, 50%, 1.00)',
};

export const TERRAIN = {
  colorShadow: 'hsla(0, 0%, 0%, 0.25)',
  colorForestTrunk: 'hsla(33, 54%, 23%, 1.00)',
  colorForestCrown: 'hsla(138, 45%, 34%, 1.00)',
  colorOreDark: 'hsla(46, 68%, 47%, 1.00)',
  colorOreLight: 'hsla(47, 87%, 70%, 1.00)',
  colorMountainDark: 'hsla(0, 0%, 43%, 1.00)',
  colorMountainLight: 'hsla(0, 0%, 60%, 1.00)',
  colorMountainSnow: 'hsla(0, 0%, 92%, 1.00)',
  colorSelectedTerrain: 'hsla(241, 32%, 55%, 0.56)',
  lineThickness: 1,
};
