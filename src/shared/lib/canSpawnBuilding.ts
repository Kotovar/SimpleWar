import {
  type Resources,
  type BuildingType,
  BUILDINGS_CONFIG,
} from '@shared/config';

type SpawnCheckResult = {
  canSpawn: boolean;
  reason: 'resources' | 'cell' | 'buildPoints' | 'none';
  message: string;
};

/**
 * Проверяет, можно ли построить здание данного типа
 * @param selectedBuildingForSpawn - здание, которое хотим построить
 * @param resources - текущие ресурсы владельца
 * @param availableSpawnPoints - доступные очки строительства у юнита
 * @returns объект с результатом и причиной отказа
 */
export const canSpawnBuilding = (
  selectedBuildingForSpawn: BuildingType,
  resources: Resources,
  availableSpawnPoints?: number,
): SpawnCheckResult => {
  const { cost } = BUILDINGS_CONFIG[selectedBuildingForSpawn];

  // 1. Проверка ресурсов
  if (resources.gold < cost.gold || resources.wood < cost.wood) {
    return {
      canSpawn: false,
      reason: 'resources',
      message: 'Недостаточно ресурсов',
    };
  }

  // 2. Проверка очков строительства
  if (availableSpawnPoints !== undefined && availableSpawnPoints <= 0) {
    return {
      canSpawn: false,
      reason: 'buildPoints',
      message: 'Нет доступных очков строительства',
    };
  }

  return { canSpawn: true, reason: 'none', message: 'Построить здание' };
};
