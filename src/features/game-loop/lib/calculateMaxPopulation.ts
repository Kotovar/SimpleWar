import type { Building } from '@shared/config';

export const calculateMaxPopulation = (buildings: Building[]): number =>
  buildings.reduce(
    (acc, building) => acc + (building.populationSupply ?? 0),
    0,
  );
