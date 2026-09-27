import { beforeEach, expect, it } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useJournalStore } from '@entities/journals';
import { build } from '@features/build';
import { getObservation, initVisibilitySystem } from '@features/visibility';

beforeEach(() => {
  useUnitsStore.getState().resetStore();
  useBuildingsStore.getState().resetStore();
  useKnowledgeStore.getState().resetStore();
  useEconomyStore.getState().resetStore();
  useEconomyStore.getState().addResources('p1', { gold: 1000, wood: 1000 });
  useJournalStore.getState().newGame();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    winner: null,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = Array.from({ length: 15 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  initVisibilitySystem();
});

it.each([
  { buildingType: 'farm' as const, edge: 9 },
  { buildingType: 'barracks' as const, edge: 9 },
  { buildingType: 'stable' as const, edge: 9 },
  { buildingType: 'workshop' as const, edge: 9 },
  { buildingType: 'sanctuary' as const, edge: 9 },
  { buildingType: 'forge' as const, edge: 9 },
  { buildingType: 'mine' as const, edge: 9 },
  { buildingType: 'sawmill' as const, edge: 9 },
  { buildingType: 'tower' as const, edge: 10 },
])(
  '$buildingType даёт обзор сразу и сохраняет его без строителя',
  ({ buildingType, edge }) => {
    if (buildingType === 'mine' || buildingType === 'sawmill') {
      useMapStore.getState().setCell(6, 7, {
        type: buildingType === 'mine' ? 'gold' : 'forest',
        isWalkable: false,
      });
    }
    const workerId = useUnitsStore
      .getState()
      .spawnUnit('worker', 5, 7, 'p1', true)!;
    const before = getObservation('p1');
    expect(before.visible[7][9]).toBe(false);

    expect(build({ actor: 'p1', workerId, buildingType, x: 6, y: 7 })).toEqual({
      ok: true,
    });
    expect(getObservation('p1').visible[7][edge]).toBe(true);
    expect(getObservation('p2').visible[7][edge]).toBe(false);

    // Убираем обзор рабочего, оставляя построенное здание единственным источником.
    useUnitsStore.getState().placeUnit(workerId, 0, 0);
    expect(getObservation('p1').visible[7][edge]).toBe(true);
    expect(getObservation('p1').visible[7][edge + 1]).toBe(false);
    expect(getObservation('p1').knownTerrain[7][edge]).toBe('grass');
  },
);
