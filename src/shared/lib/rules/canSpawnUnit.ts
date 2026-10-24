import {
  type Resources,
  type Cost,
  type PopulationCap,
  UNITS_CONFIG,
  type UnitType,
} from '@shared/config';

export type SpawnCheckResult = {
  canSpawn: boolean;
  reason: 'resources' | 'population' | 'spawnPoints' | 'none';
  message: string;
};

/**
 * Проверяет ресурсы, население и доступный запас найма юнита.
 *
 * @param selectedUnitForSpawn - Тип нанимаемого юнита.
 * @param resources - Ресурсы владельца.
 * @param populationCap - Лимит населения владельца.
 * @param availableSpawnPoints - Очки найма; без аргумента проверка пропускается.
 * @param cost - Цена источника найма; по умолчанию обычная цена юнита.
 * @returns Результат с причиной отказа и текстом для интерфейса.
 */
export const canSpawnUnit = (
  selectedUnitForSpawn: UnitType,
  resources: Resources,
  populationCap: PopulationCap,
  availableSpawnPoints?: number,
  cost: Cost = UNITS_CONFIG[selectedUnitForSpawn].cost,
): SpawnCheckResult => {
  const { requiresLimit } = UNITS_CONFIG[selectedUnitForSpawn];

  if (resources.gold < cost.gold || resources.wood < cost.wood) {
    return {
      canSpawn: false,
      reason: 'resources',
      message: 'Недостаточно ресурсов',
    };
  }

  const newOccupied = populationCap.occupied + requiresLimit;
  if (newOccupied > populationCap.max) {
    return {
      canSpawn: false,
      reason: 'population',
      message: 'Не хватает лимита населения',
    };
  }

  if (availableSpawnPoints !== undefined && availableSpawnPoints <= 0) {
    return {
      canSpawn: false,
      reason: 'spawnPoints',
      message: 'Нет доступных очков спавна',
    };
  }

  return { canSpawn: true, reason: 'none', message: 'Создать юнит' };
};
