import { calculateMaxPopulation, gameEvents } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';

// Подписка общая для всех партий и не должна дублироваться при повторном монтировании Game.
let initialized = false;

/** Подписывает учёт населения на создание и уничтожение юнитов и зданий. */
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
      addUnit(owner, unit.requiresLimit);
    }

    if (event.type === 'UNIT_DESTROYED') {
      const { removeUnit } = useEconomyStore.getState();
      const { owner, unit } = event;
      removeUnit(owner, unit.requiresLimit);
    }
  });
};
