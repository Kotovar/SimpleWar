import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useEconomyStore } from '@entities/economies';
import { calculateIncome, useGameLoopStore } from '@features/game-loop';

export const nextTurn = () => {
  const { activePlayer } = useGameLoopStore.getState();
  const buildingsStore = useBuildingsStore.getState();
  const economyStore = useEconomyStore.getState();

  const economicBuildings = buildingsStore.getEconomicBuildings(activePlayer);

  const income = calculateIncome(economicBuildings);

  economyStore.addResources(activePlayer, income);

  useUnitsStore.getState().resetUnitsForNewTurn();
  useBuildingsStore.getState().resetBuildingsForNewTurn();
  useGameLoopStore.getState().endTurn();
};

export const resetGame = () => {
  useGameLoopStore.getState().resetGame();
  useBuildingsStore.getState().resetStore();
  useUnitsStore.getState().resetStore();
  useMapStore.getState().resetStore();
  useSettingsStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
};
