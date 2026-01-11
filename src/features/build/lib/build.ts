import { BUILDINGS_CONFIG, type Owner } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';

export const build = (
  selectedUnitId: string,
  x: number,
  y: number,
  owner: Owner,
) => {
  const { spawnBuilding, selectedBuildingForSpawn } =
    useBuildingsStore.getState();

  const { removeResources, changePopulationSupply } =
    useEconomyStore.getState();

  const { changeBuildPoints, units } = useUnitsStore.getState();

  if (!selectedBuildingForSpawn) return;

  const config = BUILDINGS_CONFIG[selectedBuildingForSpawn];

  const buildCosts = config.cost;
  const populationSupply = config.populationSupply ?? 0;

  const worker = units[selectedUnitId];
  if (!worker || !('buildPoints' in worker)) return;

  spawnBuilding(selectedBuildingForSpawn, x, y, owner);

  if (populationSupply > 0) {
    changePopulationSupply(owner, populationSupply);
  }

  changeBuildPoints(selectedUnitId);
  removeResources('player', buildCosts);
};
