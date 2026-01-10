import type { BuildingType } from './buildings';
import type { CellType, Owner } from './common';
import type { MilitaryType, CivilType } from './units';

export const UNITS_NAME = {
  swordsman: 'Мечник',
  archer: 'Лучник',
  worker: 'Рабочий',
} satisfies Record<MilitaryType | CivilType, string>;

export const BUILDINGS_NAME = {
  base: 'Ратуша',
  mine: 'Золотой рудник',
  sawmill: 'Лесопилка',
} satisfies Record<BuildingType, string>;

export const OWNER_NAME = {
  player: 'Игрок',
  ai: 'Противник',
} satisfies Record<Owner, string>;

export const TERRAIN_NAME = {
  grass: 'Поле',
  mountain: 'Гора',
  water: 'Вода',
  forest: 'Лес',
  gold: 'Золотой рудник',
} satisfies Record<CellType, string>;
