import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useGameLoopStore } from '@features/game-loop';

export const nextTurn = () => {
  useGameLoopStore.getState().endTurn();
  useUnitsStore.getState().resetUnitsForNewTurn();
  useBuildingsStore.getState().resetBuildingsForNewTurn();
};

export const resetGame = () => {
  useGameLoopStore.getState().resetGame();
  useBuildingsStore.getState().resetStore();
  useUnitsStore.getState().resetStore();
  useMapStore.getState().resetStore();
  useSettingsStore.getState().resetStore();
};
