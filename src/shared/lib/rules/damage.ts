import {
  ARMOR,
  CATEGORY_AGAINST,
  DAMAGE_TYPE,
  FLYING_UNITS,
  HEALING,
  HITS_AIR,
  MAGIC_RESIST,
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

/** Летает ли тип: воздушный профиль передвижения. */
export const isFlyingType = (type: UnitType | BuildingType) =>
  FLYING_UNITS.includes(type as UnitType);

/**
 * Может ли атакующий поразить цель по матрице «земля / воздух»: воздух
 * бьют только лучник, башня, маг и летающие; землю — все атакующие.
 */
export const canHitTarget = (
  attacker: UnitType | BuildingType,
  target: UnitType | BuildingType,
) => !isFlyingType(target) || HITS_AIR.includes(attacker);

/**
 * Урон по общей формуле: атака + бонус против категории цели − защита цели
 * от типа урона атакующего (броня от физического, магическая защита от
 * магического), не меньше 1: иммунитетов нет. Одна формула для всех сторон,
 * предпросмотра, атак и подготовленного удара.
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
  const defense =
    DAMAGE_TYPE[attacker.type] === 'magic'
      ? (MAGIC_RESIST[target.type] ?? 0)
      : (ARMOR[target.type] ?? 0);
  return Math.max(1, attacker.attack + bonus - defense);
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
  const resist = MAGIC_RESIST[type] ?? 0;
  const heal = HEALING[type as UnitType];
  const hitsAir = HITS_AIR.includes(type) && type !== 'griffon';
  return [
    ...(DAMAGE_TYPE[type] === 'magic' ? ['магический урон'] : []),
    ...(heal ? [`лечит +${heal.amount} HP своему юниту`] : []),
    ...(isFlyingType(type) ? ['летает, бьёт землю и воздух'] : []),
    ...(hitsAir ? ['бьёт воздух'] : []),
    ...(armor ? [`броня ${armor}`] : []),
    ...(resist ? [`маг. защита ${resist}`] : []),
    ...bonuses,
  ];
};
