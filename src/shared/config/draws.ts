import type { CellType, Owner } from './common';

/**
 * Цвета стороны: `color` — одежда, крыши и флаги, `shade` — их затенённая
 * часть, `background` — подложка постамента.
 */
export const TEAM_MARKERS: Record<
  Owner,
  {
    background: string;
    color: string;
    shade: string;
    marker: 'circle' | 'diamond' | 'square' | 'triangle';
  }
> = {
  p1: {
    background: '#1d3a52',
    color: '#78ccff',
    shade: '#3f86c4',
    marker: 'circle',
  },
  p2: {
    background: '#4f2a25',
    color: '#ff9474',
    shade: '#c95b41',
    marker: 'diamond',
  },
  p3: {
    background: '#4d4220',
    color: '#f5d05e',
    shade: '#b8962e',
    marker: 'square',
  },
  p4: {
    background: '#3b2a4f',
    color: '#c79bff',
    shade: '#8a5fc4',
    marker: 'triangle',
  },
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
  lineColor: 'hsla(0, 0%, 0%, 0.05)',
  colorGrass: { r: 91, g: 151, b: 76 },
  /** Сухая трава: луга плавно смешиваются с основным цветом. */
  colorGrassDry: { r: 128, g: 158, b: 76 },
  colorWater: { r: 40, g: 110, b: 180 },
  colorWaterShallow: 'rgba(150, 214, 245, 0.9)',
  /** Подложки под лесом и скалами связывают соседние клетки в массив. */
  colorForestFloor: 'rgb(66, 118, 62)',
  colorSwampFloor: 'rgb(105, 126, 77)',
  colorRockFloor: 'rgb(128, 138, 106)',
};

/** Параметры отрисовки одиночного выделения */
export const SELECTED = {
  free: 'rgba(160, 222, 255, 0.2)',
  enemy: 'rgba(255, 120, 90, 0.16)',
  produce: 'rgba(245, 205, 110, 0.22)',
  freeOutline: 'rgba(214, 240, 255, 0.9)',
  enemyOutline: '#ffac91',
  produceOutline: '#f5d98f',
  /** Тёмная подводка под контуром: он читается и на траве, и на воде. */
  outlineShadow: 'rgba(22, 30, 28, 0.45)',
  lineThickness: 2,
} as const;

/** Параметры отрисовки множественного выделения клеток. */
export const SELECTION = {
  colorOutline: '#fff0c4',
  colorShadow: 'rgba(28, 36, 30, 0.75)',
  cellFill: 'rgba(255, 240, 196, 0.22)',
};

/** Цвета отрисовки рельефа */
export const TERRAIN = {
  colorShadow: 'hsla(0, 0%, 0%, 0.25)',
  colorForestTrunk: '#8a6a45',
  colorForestCrown: '#2f6a50',
  colorForestLight: '#4f9068',
  colorLeafCrown: '#4f8c3c',
  colorLeafLight: '#7fb456',
  colorOreDark: '#c4943e',
  colorOreLight: '#f5d879',
  colorMountainDark: '#687b80',
  colorMountainLight: '#aebbbd',
  colorMountainSnow: '#edf0df',
  colorSelectedTerrain: 'hsla(241, 32%, 55%, 0.56)',
  lineThickness: 1,
};

/** Туман войны: затемнение разведанного и заливка неизвестного. */
export const FOG = {
  /** Разведано, но не видно сейчас: рельеф читается, объекты приглушены. */
  explored: 'rgba(12, 16, 22, 0.52)',
  /** Никогда не разведано: сплошная заливка без намёка на рельеф. */
  unknown: '#11161c',
  /** Отметка снимка здания: сведения устарели. */
  snapshotMark: 'rgba(230, 236, 240, 0.9)',
  snapshotMarkBackground: 'rgba(20, 26, 32, 0.8)',
};

/** Цвета местности на мини-карте: плоские, без деталей основной карты. */
export const MINIMAP_TERRAIN: Record<CellType, string> = {
  grass: '#5b974c',
  hill: '#8f9b5c',
  swamp: '#6a7f4e',
  mountain: '#8b928c',
  water: '#2c6fb2',
  forest: '#2f6a50',
  gold: '#d8b04a',
};
