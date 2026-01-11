import { useEconomyStore } from './economyStore';

export const useEconomySelectors = () => {
  const resources = useEconomyStore(state => state.resources);
  const populationCap = useEconomyStore(state => state.populationCap);
  const addResources = useEconomyStore(state => state.addResources);
  const removeResources = useEconomyStore(state => state.addResources);
  const addUnits = useEconomyStore(state => state.addUnits);
  const changePopulationSupply = useEconomyStore(
    state => state.changePopulationSupply,
  );
  const setPopulationSupply = useEconomyStore(
    state => state.setPopulationSupply,
  );
  const removeUnits = useEconomyStore(state => state.removeUnits);
  const resetStore = useEconomyStore(state => state.resetStore);

  return {
    resources,
    populationCap,
    addResources,
    removeResources,
    addUnits,
    changePopulationSupply,
    setPopulationSupply,
    removeUnits,
    resetStore,
  };
};
