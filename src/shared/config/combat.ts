import type { BuildingType } from './buildings';
import type { MilitaryType, UnitType } from './units';

/**
 * Категория цели для бонусов урона. Не путать с ролью (`military`/`civil`)
 * и способом передвижения: категория нужна только формуле урона.
 */
export type TargetCategory =
  | 'infantry'
  | 'ranged'
  | 'cavalry'
  | 'siege'
  | 'civil'
  | 'flying'
  | 'building';

/** Категория в словах «против …»: для карточек и подсказок. */
export const CATEGORY_AGAINST: Record<TargetCategory, string> = {
  infantry: 'пехоты',
  ranged: 'стрелков',
  cavalry: 'конницы',
  siege: 'осады',
  civil: 'рабочих',
  flying: 'летающих',
  building: 'зданий',
};

/** Категория каждого юнита; все здания — `building`. */
export const UNIT_CATEGORY = {
  worker: 'civil',
  swordsman: 'infantry',
  spearman: 'infantry',
  scout: 'infantry',
  archer: 'ranged',
  rider: 'cavalry',
  siege: 'siege',
  mage: 'ranged',
  healer: 'ranged',
  griffon: 'flying',
} as const satisfies Record<UnitType, TargetCategory>;

/** Тип урона: физический или магический; защита от одного не защищает от другого. */
export type DamageType = 'physical' | 'magic';

/** Тип урона атакующего; не указан — физический. */
export const DAMAGE_TYPE: Partial<Record<UnitType | BuildingType, DamageType>> =
  { mage: 'magic' };

/**
 * Физическая защита (броня): вычитается из физического урона, итог не
 * меньше 1. Старт; у исходных юнитов и зданий 0 — их прежний бой не изменился.
 */
export const ARMOR: Partial<Record<UnitType | BuildingType, number>> = {
  spearman: 2,
  rider: 1,
  griffon: 1,
};

/**
 * Магическая защита: вычитается из магического урона. Здания держат магию:
 * маг не заменяет осаду.
 */
export const MAGIC_RESIST: Partial<Record<UnitType | BuildingType, number>> = {
  mage: 4,
  healer: 4,
  base: 10,
  mine: 10,
  sawmill: 10,
  farm: 10,
  barracks: 10,
  tower: 10,
  stable: 10,
  workshop: 10,
  forge: 10,
  sanctuary: 10,
  palisade: 10,
};

/** Способ передвижения: наземный или воздушный. */
export type MovementProfile = 'ground' | 'air';

/** Летающие типы: пролетают над препятствиями, стоят только на свободной клетке. */
export const FLYING_UNITS: readonly UnitType[] = ['griffon'];

/**
 * Кто может атаковать воздушные цели (S14b). Мечник, копейщик, всадник,
 * разведчик и осада воздух не бьют.
 */
export const HITS_AIR: readonly (UnitType | BuildingType)[] = [
  'archer',
  'tower',
  'mage',
  'griffon',
];

/** Лечение: сколько HP и на какой дальности; одно боевое действие. */
export const HEALING: Partial<Record<UnitType, { amount: number }>> = {
  healer: { amount: 12 },
};

/** Явные бонусы урона против категорий цели. */
export const DAMAGE_BONUS: Partial<
  Record<MilitaryType, Partial<Record<TargetCategory, number>>>
> = {
  swordsman: { building: 28 },
  spearman: { cavalry: 16 },
  rider: { ranged: 10, civil: 10 },
  siege: { building: 108 },
  archer: { flying: 6, building: 10 },
  griffon: { building: 17 },
};

/** Дальность подготовленного удара осадной машины по Manhattan. */
export const SIEGE_STRIKE = { minRange: 2, maxRange: 5 };
