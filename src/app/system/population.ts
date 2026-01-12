import { calculateMaxPopulation, gameEvents } from '@shared/lib';
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
      const { owner } = event;

      const { getLimitBuildings } = useBuildingsStore.getState();
      const { setPopulationSupply } = useEconomyStore.getState();

      const limitBuildings = getLimitBuildings(owner);
      const supply = calculateMaxPopulation(limitBuildings);

      setPopulationSupply(owner, supply);
    }

    if (event.type === 'UNIT_SPAWNED') {
      const { addUnit } = useEconomyStore.getState();
      const { owner, unit } = event;
      const unitCost = unit.requiresLimit ?? 1;
      addUnit(owner, unitCost);
    }

    if (event.type === 'UNIT_DESTROYED') {
      const { removeUnit } = useEconomyStore.getState();
      const { owner, unit } = event;
      const unitCost = unit.requiresLimit ?? 1;
      removeUnit(owner, unitCost);
    }
  });
};
