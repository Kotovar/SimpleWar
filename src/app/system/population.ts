import { calculateMaxPopulation, gameEvents } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';

let initialized = false;

export const initPopulationSystem = () => {
  if (initialized) return;

  initialized = true;

  gameEvents.subscribe(event => {
    if (
      event.type !== 'BUILDING_SPAWNED' &&
      event.type !== 'BUILDING_DESTROYED'
    ) {
      return;
    }

    const { owner } = event;

    const { getLimitBuildings } = useBuildingsStore.getState();
    const { setPopulationSupply } = useEconomyStore.getState();

    const limitBuildings = getLimitBuildings(owner);
    const supply = calculateMaxPopulation(limitBuildings);

    setPopulationSupply(owner, supply);
  });
};
