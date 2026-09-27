import {
  ARMOR,
  CATEGORY_AGAINST,
  DAMAGE_BONUS,
  UNIT_CATEGORY,
  type BuildingType,
  type MilitaryType,
  type TargetCategory,
  type UnitType,
} from '@shared/config';

/** Категория цели для бонусов: у юнитов — из конфигурации, здания — `building`. */
export const getTargetCategory = (
  type: UnitType | BuildingType,
): TargetCategory =>
  type in UNIT_CATEGORY ? UNIT_CATEGORY[type as UnitType] : 'building';

/**
 * Урон по общей формуле: атака + бонус против категории цели − броня цели,
 * не меньше 1. Одна формула для всех сторон, атак и подготовленного удара.
 *
 * @param attacker - Тип и атака атакующего.
 * @param target - Тип цели.
 * @returns Итоговый урон.
 */
export const calculateDamage = (
  attacker: { type: UnitType | BuildingType; attack: number },
  target: { type: UnitType | BuildingType },
) => {
  const bonuses = DAMAGE_BONUS[attacker.type as MilitaryType] ?? {};
  const bonus = bonuses[getTargetCategory(target.type)] ?? 0;
  const armor = ARMOR[target.type] ?? 0;
  return Math.max(1, attacker.attack + bonus - armor);
};

/**
 * Боевые особенности типа для карточек: броня и бонусы против категорий.
 *
 * @returns Строки вроде «броня 2», «+16 против конницы».
 */
export const getCombatTraits = (type: UnitType | BuildingType): string[] => {
  const armor = ARMOR[type] ?? 0;
  const bonuses = Object.entries(DAMAGE_BONUS[type as MilitaryType] ?? {}).map(
    ([category, value]) =>
      `+${value} против ${CATEGORY_AGAINST[category as TargetCategory]}`,
  );
  return [...(armor ? [`броня ${armor}`] : []), ...bonuses];
};
