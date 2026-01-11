import { calculateMaxPopulation, gameEvents } from '@shared/lib';
import { BUILDINGS_CONFIG } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';

let initialized = false;

export const initPopulationSystem = () => {
  if (initialized) return;

  initialized = true;

  gameEvents.subscribe(event => {
    if (
      event.type === 'BUILDING_SPAWNED' ||
      event.type === 'BUILDING_DESTROYED'
    ) {
      const config = BUILDINGS_CONFIG[event.building.type];

      if ((config.populationSupply ?? 0) === 0) return;

      const { getLimitBuildings } = useBuildingsStore.getState();
      const { setPopulationSupply } = useEconomyStore.getState();

      const buildings = getLimitBuildings(event.owner);
      const supply = calculateMaxPopulation(buildings);
      setPopulationSupply(event.owner, supply);
    }
  });
};
