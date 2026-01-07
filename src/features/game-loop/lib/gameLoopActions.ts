import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useGameLoopStore } from '@features/game-loop';

export const nextTurn = () => {
  useGameLoopStore.getState().endTurn();
  useUnitsStore.getState().resetUnitsForNewTurn();
  useBuildingsStore.getState().resetBuildingsForNewTurn();
};
