import type { Owner } from './common';

export const TEAM_MARKERS: Record<
  Owner,
  { background: string; color: string; symbol: string }
> = {
  player: { background: '#233e50', color: '#78ccff', symbol: '●' },
  ai: { background: '#51302d', color: '#ff9474', symbol: '◆' },
};

export const HP_BAR = {
  widthRatio: 0.44, // Ширина HP-бара относительно клетки
  heightRatio: 0.06, // Высота HP-бара
  yOffsetRatio: 0.12, // Отступ сверху клетки
  lineWidth: 1, // Цвет фона (пустое здоровье)
  colorRed: 'hsla(0, 100%, 50%, 1.00)', // Цвет фона (пустое здоровье)
  colorGreen: 'hsla(120, 100%, 50%, 1.00)', // Цвет заполнения (оставшееся здоровье)
  colorBorder: 'hsla(0, 0%, 0%, 1.00)', // Цвет обводки
};

// Совместимые экспорты прежних палитр: материалы больше не зависят от команды.
// Список команд берётся только из TEAM_MARKERS.
const forTeams = <T>(palette: T): Record<Owner, T> =>
  Object.fromEntries(
    Object.keys(TEAM_MARKERS).map(owner => [owner, palette]),
  ) as Record<Owner, T>;

export const BUILDING_TOWNHALL_PALETTES = forTeams({
  wall: '#dce1d5',
  door: '#313b42',
  window: '#536775',
});
export const BUILDING_MINE_PALETTES = forTeams({
  wood: '#b98a51',
  gold: '#f5cd53',
  shadow: '#252e33',
  accent: '#e1b578',
});
export const BUILDING_SAWMILL_PALETTES = forTeams({
  wood: '#b88b58',
  roof: '#6d7e70',
  smoke: '#89918e',
  accent: '#e8bf80',
  window: '#303a36',
});
export const BUILDING_FARM_PALETTES = forTeams({
  wood: '#e1c996',
  door: '#68503e',
  window: '#303a36',
  roof: '#d6aa47',
  hay: '#f7d776',
});
export const BUILDING_BARRACKS_PALETTES = forTeams({
  wall: '#bbb6a3',
  door: '#41434a',
  accent: '#ddd9c7',
  window: '#303a36',
  staff: '#736c59',
});
export const BUILDING_TOWER_PALETTES = forTeams({
  wall: '#dce1d5',
  door: '#384650',
  window: '#384650',
});
export const UNIT_PALETTES = forTeams({
  body: '#a9bbc3',
  bodyArcher: '#768563',
  head: '#e3bd8b',
  sword: '#edf2df',
  arrowShaft: '#e4b875',
  accent: '#d6b265',
});

export const GRID = {
  lineThickness: 1,
  lineColor: 'hsla(0, 0%, 0%, 0.04)',
  colorGrass: { r: 91, g: 151, b: 76 },
  colorWater: { r: 40, g: 110, b: 180 },
};

export const SELECTED = {
  free: 'hsla(137, 100%, 50%, 0.44)',
  enemy: 'hsla(0, 100%, 50%, 0.26)',
  produce: 'hsla(233, 97%, 41%, 0.26)',
  lineThickness: 2,
} as const;

export const SELECTION = {
  colorOutline: 'hsla(148, 100%, 50%, 1.00)',
};

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
