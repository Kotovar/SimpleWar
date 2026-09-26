import type { BuildingType } from './buildings';
import type { CellType, Owner } from './common';
import type { MilitaryType, CivilType } from './units';

/** Игровые названия юнитов. */
export const UNITS_NAME = {
  swordsman: 'Мечник',
  archer: 'Лучник',
  worker: 'Рабочий',
} satisfies Record<MilitaryType | CivilType, string>;

/** Игровые названия зданий. */
export const BUILDINGS_NAME = {
  base: 'Ратуша',
  mine: 'Золотой рудник',
  sawmill: 'Лесопилка',
  farm: 'Ферма',
  barracks: 'Казармы',
  tower: 'Башня',
} satisfies Record<BuildingType, string>;

/** Игровые названия сторон по цвету слота. */
export const OWNER_NAME = {
  p1: 'Синие',
  p2: 'Красные',
  p3: 'Жёлтые',
  p4: 'Фиолетовые',
} satisfies Record<Owner, string>;

/** Игровые названия местности. */
export const TERRAIN_NAME = {
  grass: 'Поле',
  hill: 'Холм',
  swamp: 'Болото',
  mountain: 'Гора',
  water: 'Вода',
  forest: 'Лес',
  gold: 'Золотой рудник',
} satisfies Record<CellType, string>;
