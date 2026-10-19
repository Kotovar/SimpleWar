import {
  ARMOR,
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
 * @param armorBonus - Прибавка к физической защите от исследований цели
 *   (Строй); от магии не защищает.
 * @returns Итоговый урон.
 */
export const calculateDamage = (
  attacker: { type: UnitType | BuildingType; attack: number },
  target: { type: UnitType | BuildingType },
  armorBonus = 0,
) => {
  const bonuses = DAMAGE_BONUS[attacker.type as MilitaryType] ?? {};
  const bonus = bonuses[getTargetCategory(target.type)] ?? 0;
  const defense =
    DAMAGE_TYPE[attacker.type] === 'magic'
      ? (MAGIC_RESIST[target.type] ?? 0)
      : (ARMOR[target.type] ?? 0) + armorBonus;
  return Math.max(1, attacker.attack + bonus - defense);
};

/** Боевые свойства типа для карточек: всё, что показывается иконками. */
export type CombatProfile = {
  damageType: 'physical' | 'magic';
  /** Бонусы урона против категорий цели. */
  bonuses: { category: TargetCategory; value: number }[];
  /** Физическая защита (броня). */
  armor: number;
  magicResist: number;
  /** Летает сам. */
  flies: boolean;
  /** Может атаковать воздушные цели. */
  hitsAir: boolean;
  /** Сколько HP возвращает лечением; `0` — не лечит. */
  heal: number;
};

/**
 * Боевой профиль типа: тип урона, бонусы, защита, полёт, лечение.
 *
 * @param type - Тип юнита или здания.
 */
export const getCombatProfile = (
  type: UnitType | BuildingType,
): CombatProfile => ({
  damageType: DAMAGE_TYPE[type] ?? 'physical',
  bonuses: Object.entries(DAMAGE_BONUS[type as MilitaryType] ?? {}).map(
    ([category, value]) => ({ category: category as TargetCategory, value }),
  ),
  armor: ARMOR[type] ?? 0,
  magicResist: MAGIC_RESIST[type] ?? 0,
  flies: isFlyingType(type),
  hitsAir: HITS_AIR.includes(type),
  heal: HEALING[type as UnitType]?.amount ?? 0,
});

type FormationMember = {
  id: string;
  type: UnitType | BuildingType;
  owner: string;
  x: number;
  y: number;
};

/**
 * Стоит ли рядом с копейщиком по стороне (не по диагонали) свой копейщик —
 * условие Строя. Наличие исследования проверяет вызывающий.
 *
 * @param unit - Копейщик-цель.
 * @param units - Все юниты мира.
 */
export const hasFormationNeighbor = (
  unit: FormationMember,
  units: Iterable<FormationMember>,
) => {
  if (unit.type !== 'spearman') return false;
  for (const other of units) {
    if (
      other.id !== unit.id &&
      other.type === 'spearman' &&
      other.owner === unit.owner &&
      Math.abs(other.x - unit.x) + Math.abs(other.y - unit.y) === 1
    ) {
      return true;
    }
  }
  return false;
};
