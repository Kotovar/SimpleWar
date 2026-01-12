import type { ProductionBuilding, SupplyBuilding } from '@shared/config';

export const calculateMaxPopulation = (
  buildings: (ProductionBuilding | SupplyBuilding)[],
): number =>
  buildings.reduce(
    (acc, building) => acc + (building.populationSupply ?? 0),
    0,
  );
