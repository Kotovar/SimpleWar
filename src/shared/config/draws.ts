import type { Owner } from './common';

/** Цвета и символы для команд игрока и ИИ. */
export const TEAM_MARKERS: Record<
  Owner,
  { background: string; color: string; symbol: string }
> = {
  player: { background: '#233e50', color: '#78ccff', symbol: '●' },
  ai: { background: '#51302d', color: '#ff9474', symbol: '◆' },
};

/** Параметры отрисовки полосы здоровья над зданиями. */
export const HP_BAR = {
  widthRatio: 0.65,
  heightRatio: 0.085,
  yOffsetRatio: 0.025,
  lineWidth: 1,
  colorRed: '#ee9278',
  colorAmber: '#e8c76c',
  colorGreen: '#a4ce83',
  colorBackground: '#343e3e',
  colorBorder: '#202c30',
};

/** Параметры отрисовки сетки карты. */
export const GRID = {
  lineThickness: 1,
  lineColor: 'hsla(0, 0%, 0%, 0.025)',
  colorGrass: { r: 91, g: 151, b: 76 },
  colorWater: { r: 40, g: 110, b: 180 },
};

/** Параметры отрисовки одиночного выделения */
export const SELECTED = {
  free: 'rgba(153, 218, 233, 0.14)',
  enemy: 'rgba(244, 151, 122, 0.12)',
  produce: 'rgba(234, 196, 110, 0.12)',
  freeOutline: 'rgba(190, 235, 241, 0.4)',
  enemyOutline: '#ffac91',
  produceOutline: '#f0d58d',
  lineThickness: 2,
} as const;

/** Параметры отрисовки множественного выделения клеток. */
export const SELECTION = {
  colorOutline: '#fff0c4',
  colorShadow: '#374438',
  cellFill: 'rgba(255, 240, 196, 0.09)',
};

/** Цвета отрисовки рельефа */
export const TERRAIN = {
  colorShadow: 'hsla(0, 0%, 0%, 0.25)',
  colorForestTrunk: '#b98a51',
  colorForestCrown: '#416859',
  colorForestLight: '#80a073',
  colorOreDark: '#c4943e',
  colorOreLight: '#f5d879',
  colorMountainDark: '#687b80',
  colorMountainLight: '#aebbbd',
  colorMountainSnow: '#edf0df',
  colorSelectedTerrain: 'hsla(241, 32%, 55%, 0.56)',
  lineThickness: 1,
};
