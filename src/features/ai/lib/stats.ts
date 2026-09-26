import {
  BUILDINGS_CONFIG,
  COMBAT_BUILDINGS_CONFIG,
  MILITARY_UNITS_CONFIG,
  UNITS_CONFIG,
  type BuildingType,
  type UnitType,
} from '@shared/config';

/** Публичные боевые свойства типа: их знают все, это не скрытое знание. */
export type TypeStats = {
  attack: number;
  range: number;
  /** Очки движения за ход; у зданий 0. */
  move: number;
  /** Может ли атаковать. */
  armed: boolean;
};

const isUnitType = (type: string): type is UnitType => type in UNITS_CONFIG;

/**
 * Боевые свойства по типу объекта из общей конфигурации.
 *
 * @param type - Тип юнита или здания.
 */
export const statsOf = (type: UnitType | BuildingType): TypeStats => {
  if (isUnitType(type)) {
    const military =
      type in MILITARY_UNITS_CONFIG
        ? MILITARY_UNITS_CONFIG[type as keyof typeof MILITARY_UNITS_CONFIG]
        : null;
    return {
      attack: military?.attack ?? 0,
      range: military?.attackRange ?? 0,
      move: UNITS_CONFIG[type].maxMovePoints,
      armed: !!military,
    };
  }
  const combat =
    type in COMBAT_BUILDINGS_CONFIG
      ? COMBAT_BUILDINGS_CONFIG[type as keyof typeof COMBAT_BUILDINGS_CONFIG]
      : null;
  return {
    attack: combat?.attack ?? 0,
    range: combat?.attackRange ?? 0,
    move: 0,
    armed: !!combat && type in BUILDINGS_CONFIG,
  };
};

/**
 * Боевая сила объекта: урон с поправкой на запас здоровья.
 *
 * @param type - Тип объекта.
 * @param hp - Текущее или наблюдённое HP.
 */
export const powerOf = (type: UnitType | BuildingType, hp: number) => {
  const { attack, armed } = statsOf(type);
  return armed ? attack * Math.sqrt(Math.max(1, hp)) : 0;
};
