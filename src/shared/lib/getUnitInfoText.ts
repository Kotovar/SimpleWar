import { BUILDINGS_NAME, UNITS_CONFIG, UnitType } from '@shared/config';

/**
 * Возвращает краткую информацию о юните для отображения в UI .
 * @param unitType - тип юнита
 * @returns строка с описанием или пустая строка, если ничего показывать не нужно
 */
export const getUnitInfoText = (unitType: UnitType): string => {
  switch (unitType) {
    case 'swordsman':
    case 'archer':
      return UNITS_CONFIG[unitType].attack &&
        UNITS_CONFIG[unitType].attackRange &&
        UNITS_CONFIG[unitType].maxMovePoints
        ? `атака ${UNITS_CONFIG[unitType].attack} : радиус атаки ${UNITS_CONFIG[unitType].attackRange} : ходы ${UNITS_CONFIG[unitType].maxMovePoints}`
        : '';

    case 'worker':
      if (!UNITS_CONFIG[unitType].buildableBuildings) return '';
      return `ходы ${UNITS_CONFIG[unitType].maxMovePoints} : производит: ${UNITS_CONFIG[
        unitType
      ].buildableBuildings
        .map(building => BUILDINGS_NAME[building])
        .join(', ')}`;

    default:
      return '';
  }
};
