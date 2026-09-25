import {
  START_POPULATION_CAP_DEFAULT,
  type SupplyBuilding,
} from '@shared/config';

/**
 * Складывает базовую вместимость и снабжение зданий.
 *
 * @param buildings - Здания снабжения владельца.
 * @returns Вместимость без общего лимита; стор экономики применяет предел.
 */
export const calculateMaxPopulation = (buildings: SupplyBuilding[]): number =>
  buildings.reduce(
    (acc, building) => acc + building.populationSupply,
    START_POPULATION_CAP_DEFAULT,
  );
