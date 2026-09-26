import {
  BUILDINGS_CONFIG,
  UNITS_NAME,
  type BuildingType,
} from '@shared/config';

/**
 * Возвращает описание назначения здания для интерфейса.
 *
 * @param buildingType - Тип здания.
 * @returns Описание или пустую строку, если его нет.
 */
export const getBuildingInfoText = (buildingType: BuildingType): string => {
  switch (buildingType) {
    case 'mine':
      return BUILDINGS_CONFIG[buildingType].income.gold
        ? `+${BUILDINGS_CONFIG[buildingType].income.gold} золота/ход, только если рядом работает назначенный рабочий`
        : '';

    case 'sawmill':
      return BUILDINGS_CONFIG[buildingType].income.wood
        ? `+${BUILDINGS_CONFIG[buildingType].income.wood} дерева/ход, только если рядом работает назначенный рабочий`
        : '';

    case 'farm':
      return BUILDINGS_CONFIG[buildingType].populationSupply
        ? `+${BUILDINGS_CONFIG[buildingType].populationSupply} к лимиту юнитов`
        : '';

    case 'tower':
      return BUILDINGS_CONFIG[buildingType].attack &&
        BUILDINGS_CONFIG[buildingType].attackRange
        ? `Наносит ${BUILDINGS_CONFIG[buildingType].attack} урона на расстоянии ${BUILDINGS_CONFIG[buildingType].attackRange}`
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
