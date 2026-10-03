import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS } from '@shared/config';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import { useSelectionStore } from '@features/selection';
import { input, unit } from '../lib/actions.test-utils';
import { action } from '../lib/actionButton';
import { runSelectionAction } from './runSelectionAction';

beforeEach(() => {
  useJournalStore.getState().newGame();
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.getState().resetStore();
  useSelectionStore.getState().resetStore();
  useHighlightStore.getState().resetStore();
  useMovementStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
});

describe('сон выбранного юнита', () => {
  it.each([
    { restMode: undefined, activePlayer: 'p1', deselected: true },
    { restMode: 'sleep' as const, activePlayer: 'p1', deselected: false },
    { restMode: undefined, activePlayer: 'p2', deselected: false },
  ] as const)(
    'сон=$restMode, ход=$activePlayer: снятие выбора=$deselected',
    ({ restMode, activePlayer, deselected }) => {
      const selected = unit('worker', { restMode });
      useUnitsStore.setState({ units: { [selected.id]: selected } });
      useSelectionStore.getState().selectUnit(selected.id);
      useGameLoopStore.setState({ activePlayer });
      useMovementStore
        .getState()
        .setPlannedTarget({ unitId: selected.id, x: 9, y: 5 });

      runSelectionAction(action('sleep'), {
        humanId: 'p1',
        unit: selected,
        building: null,
        input: input({ unit: selected }),
      });

      expect(useSelectionStore.getState().selection).toEqual(
        deselected ? null : { kind: 'unit', id: selected.id },
      );
      expect(useUnitsStore.getState().units[selected.id].restMode).toBe(
        activePlayer === 'p2'
          ? undefined
          : restMode === 'sleep'
            ? undefined
            : 'sleep',
      );
      if (deselected) {
        expect(useMovementStore.getState().plannedTarget).toBeNull();
        expect(useMovementStore.getState().reachableCells).toBeNull();
      }
    },
  );
});
