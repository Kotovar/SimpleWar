import { useEconomyStore } from './economyStore';

export const useEconomySelectors = () => {
  const resources = useEconomyStore(state => state.resources);
  const populationCap = useEconomyStore(state => state.populationCap);
  const addResources = useEconomyStore(state => state.addResources);
  const removeResources = useEconomyStore(state => state.addResources);
  const addUnit = useEconomyStore(state => state.addUnit);

  const setPopulationSupply = useEconomyStore(
    state => state.setPopulationSupply,
  );
  const removeUnit = useEconomyStore(state => state.removeUnit);
  const resetStore = useEconomyStore(state => state.resetStore);

  return {
    resources,
    populationCap,
    addResources,
    removeResources,
    addUnit,
    setPopulationSupply,
    removeUnit,
    resetStore,
  };
};
