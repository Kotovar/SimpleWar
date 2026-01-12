import {
  type Resources,
  type PopulationCap,
  UNITS_CONFIG,
  UnitType,
} from '@shared/config';

export type SpawnCheckResult = {
  canSpawn: boolean;
  reason: 'resources' | 'population' | 'spawnPoints' | 'none';
  message: string;
};

/**
 * Проверяет, можно ли заспавнить юнита данного типа
 * @param selectedUnitForSpawn - юнит, который хотим заспавнить
 * @param resources - текущие ресурсы владельца
 * @param populationCap - текущий лимит населения владельца
 * @param availableSpawnPoints - доступные очки спавна у здания
 * @returns объект с результатом и причиной отказа
 */
export const canSpawnUnit = (
  selectedUnitForSpawn: UnitType,
  resources: Resources,
  populationCap: PopulationCap,
  availableSpawnPoints?: number,
): SpawnCheckResult => {
  const { cost, requiresLimit } = UNITS_CONFIG[selectedUnitForSpawn];

  // 1. Проверка ресурсов
  if (resources.gold < cost.gold || resources.wood < cost.wood) {
    return {
      canSpawn: false,
      reason: 'resources',
      message: 'Недостаточно ресурсов',
    };
  }

  // 2. Проверка лимита населения
  const newOccupied = populationCap.occupied + requiresLimit;
  if (newOccupied > populationCap.max) {
    return {
      canSpawn: false,
      reason: 'population',
      message: `Не хватает лимита населения`,
    };
  }

  // 3. Проверка очков спавна
  if (availableSpawnPoints !== undefined && availableSpawnPoints <= 0) {
    return {
      canSpawn: false,
      reason: 'spawnPoints',
      message: 'Нет доступных очков спавна',
    };
  }

  return { canSpawn: true, reason: 'none', message: 'Создать юнит' };
};
