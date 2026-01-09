import { useEconomyStore } from './economyStory';

export const useEconomySelectors = () => {
  const resources = useEconomyStore(state => state.resources);
  const unitLimit = useEconomyStore(state => state.unitLimit);
  const addResources = useEconomyStore(state => state.addResources);
  const addUnits = useEconomyStore(state => state.addUnits);
  const changeUnitLimit = useEconomyStore(state => state.changeUnitLimit);
  const removeUnits = useEconomyStore(state => state.removeUnits);
  const resetStore = useEconomyStore(state => state.resetStore);

  return {
    resources,
    unitLimit,
    addResources,
    addUnits,
    changeUnitLimit,
    removeUnits,
    resetStore,
  };
};
