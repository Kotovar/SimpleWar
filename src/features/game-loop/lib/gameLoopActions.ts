import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { calculateIncome } from './calculateIncome';

/**
 * Начисляет доход активной стороне, передаёт ход следующему участнику
 * и восстанавливает очки только ему.
 */
export const nextTurn = () => {
  const { activePlayer, phase } = useGameLoopStore.getState();

  if (phase !== 'inProgress') return;

  const { getEconomicBuildings } = useBuildingsStore.getState();
  const { addResources } = useEconomyStore.getState();

  const economicBuildings = getEconomicBuildings(activePlayer);

  const income = calculateIncome(economicBuildings);

  addResources(activePlayer, income);

  useGameLoopStore.getState().endTurn();

  const next = useGameLoopStore.getState().activePlayer;
  useUnitsStore.getState().resetUnitsForNewTurn(next);
  useBuildingsStore.getState().resetBuildingsForNewTurn(next);
};

/** Сбрасывает фазу, объекты, карту, настройки и экономику партии. */
export const resetGame = () => {
  useGameLoopStore.getState().resetGame();
  useBuildingsStore.getState().resetStore();
  useUnitsStore.getState().resetStore();
  useMapStore.getState().resetStore();
  useSettingsStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
};
