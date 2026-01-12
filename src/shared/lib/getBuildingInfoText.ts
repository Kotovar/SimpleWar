import { BUILDINGS_CONFIG, UNITS_NAME, BuildingType } from '@shared/config';

/**
 * Возвращает краткую информацию о здании для отображения в UI .
 * @param buildingType - тип здания
 * @returns строка с описанием или пустая строка, если ничего показывать не нужно
 */
export const getBuildingInfoText = (buildingType: BuildingType): string => {
  switch (buildingType) {
    case 'mine':
      return BUILDINGS_CONFIG[buildingType].income.gold
        ? `Добывает ${BUILDINGS_CONFIG[buildingType].income.gold} золота/ход`
        : '';

    case 'sawmill':
      return BUILDINGS_CONFIG[buildingType].income.wood
        ? `Добывает ${BUILDINGS_CONFIG[buildingType].income.wood} дерева/ход`
        : '';

    case 'farm':
      return BUILDINGS_CONFIG[buildingType].populationSupply
        ? `+${BUILDINGS_CONFIG[buildingType].populationSupply} к лимиту юнитов`
        : '';

    case 'barracks':
      if (!BUILDINGS_CONFIG[buildingType].spawningUnits.length) return '';
      return `Производит: ${BUILDINGS_CONFIG[buildingType].spawningUnits
        .map(unit => UNITS_NAME[unit])
        .join(', ')}`;

    default:
      return '';
  }
};
