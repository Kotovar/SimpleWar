import type { BuildingType } from './buildings';
import type { CellType, Owner } from './common';
import type { UnitType } from './units';

export const UNITS_NAME = {
  swordsman: 'Meчник',
  archer: 'Лучник',
} satisfies Record<UnitType, string>;

export const BUILDINGS_NAME = {
  base: 'Ратуша',
} satisfies Record<BuildingType, string>;

export const OWNER_NAME = {
  player: 'Игрок',
  enemy: 'Противник',
} satisfies Record<Owner, string>;

export const TERRAIN_NAME = {
  grass: 'Поле',
  mountain: 'Гора',
  water: 'Вода',
  forest: 'Лес',
  gold: 'Золотой рудник',
} satisfies Record<CellType, string>;
