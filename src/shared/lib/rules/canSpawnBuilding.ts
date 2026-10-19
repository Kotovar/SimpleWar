import {
  type Resources,
  type BuildingType,
  type ResearchType,
  BUILDING_RESEARCH,
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

/**
 * Открыт ли тип здания стороне: часть построек требует исследования
 * (частокол — Инженерии).
 *
 * @param type - Тип здания.
 * @param researched - Изученные стороной исследования.
 */
export const isBuildingUnlocked = (
  type: BuildingType,
  researched: readonly ResearchType[] = [],
) => {
  const required = BUILDING_RESEARCH[type as keyof typeof BUILDING_RESEARCH];
  return !required || researched.includes(required);
};
