import {
  type Resources,
  type BuildingType,
  BUILDINGS_CONFIG,
} from '@shared/config';

type SpawnCheckResult = {
  canSpawn: boolean;
  reason: 'resources' | 'buildPoints' | 'none';
  message: string;
};

/**
 * Проверяет ресурсы и очки рабочего для строительства здания.
 *
 * @param selectedBuildingForSpawn - Тип строящегося здания.
 * @param resources - Ресурсы владельца.
 * @param availableBuildPoints - Очки строительства; без аргумента проверка пропускается.
 * @returns Результат с причиной отказа и текстом для интерфейса.
 */
export const canSpawnBuilding = (
  selectedBuildingForSpawn: BuildingType,
  resources: Resources,
  availableBuildPoints?: number,
): SpawnCheckResult => {
  const { cost } = BUILDINGS_CONFIG[selectedBuildingForSpawn];

  if (resources.gold < cost.gold || resources.wood < cost.wood) {
    return {
      canSpawn: false,
      reason: 'resources',
      message: 'Недостаточно ресурсов',
    };
  }

  if (availableBuildPoints !== undefined && availableBuildPoints <= 0) {
    return {
      canSpawn: false,
      reason: 'buildPoints',
      message: 'Нет доступных очков строительства',
    };
  }

  return { canSpawn: true, reason: 'none', message: 'Построить здание' };
};
