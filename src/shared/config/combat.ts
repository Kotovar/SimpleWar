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
  | 'building';

/** Категория в словах «против …»: для карточек и подсказок. */
export const CATEGORY_AGAINST: Record<TargetCategory, string> = {
  infantry: 'пехоты',
  ranged: 'стрелков',
  cavalry: 'конницы',
  siege: 'осады',
  civil: 'рабочих',
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
} as const satisfies Record<UnitType, TargetCategory>;

/**
 * Броня: вычитается из урона, итог не меньше 1. Старт; у исходных юнитов
 * и зданий 0, чтобы их прежний бой не изменился.
 */
export const ARMOR: Partial<Record<UnitType | BuildingType, number>> = {
  spearman: 2,
  rider: 1,
};

/** Явные бонусы урона против категорий цели. */
export const DAMAGE_BONUS: Partial<
  Record<MilitaryType, Partial<Record<TargetCategory, number>>>
> = {
  spearman: { cavalry: 16 },
  rider: { ranged: 10, civil: 10 },
  siege: { building: 40 },
};

/** Дальность подготовленного удара осадной машины по Manhattan. */
export const SIEGE_STRIKE = { minRange: 2, maxRange: 5 };
