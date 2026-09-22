import type { Owner } from './common';

export const TEAM_MARKERS: Record<
  Owner,
  { background: string; color: string; symbol: string }
> = {
  player: { background: '#233e50', color: '#78ccff', symbol: '●' },
  ai: { background: '#51302d', color: '#ff9474', symbol: '◆' },
};

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
  free: 'rgba(137, 201, 219, 0.16)',
  enemy: 'rgba(244, 151, 122, 0.12)',
  produce: 'rgba(234, 196, 110, 0.18)',
  freeOutline: '#a3d3df',
  enemyOutline: '#ffac91',
  produceOutline: '#f0d58d',
  lineThickness: 2,
} as const;

export const SELECTION = {
  colorOutline: '#fff0c4',
  colorShadow: '#374438',
  cellFill: 'rgba(255, 240, 196, 0.09)',
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
