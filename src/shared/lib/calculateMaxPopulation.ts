import {
  START_POPULATION_CAP_DEFAULT,
  type SupplyBuilding,
} from '@shared/config';

export const calculateMaxPopulation = (buildings: SupplyBuilding[]): number =>
  buildings.reduce(
    (acc, building) => acc + building.populationSupply,
    START_POPULATION_CAP_DEFAULT,
  );
