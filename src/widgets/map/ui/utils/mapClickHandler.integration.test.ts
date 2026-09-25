import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useJournalStore } from '@entities/journals';
import { move } from '@features/pathfinding';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import { attack } from '@features/combat';
import { handleMapCellClick } from './mapClickHandler';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();
const economy = () => useEconomyStore.getState();

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  economy().resetStore();
  useJournalStore.getState().newGame();
  useGameLoopStore.getState().startGame();
  const grid: Cell[][] = Array.from({ length: 7 }, (_, y) =>
    Array.from({ length: 7 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
});

/** Одинаковая сцена: рабочий p1 в (3, 3) и достаточно дерева на ферму. */
const setupScene = () => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  economy().resetStore();
  economy().addResources('p1', { wood: 400 });
  return units().spawnUnit('worker', 3, 3, 'p1', true)!;
};

const outcome = () => ({
  farm: buildings().getBuildingAt(4, 3)?.type,
  worker: Object.values(units().units).map(({ x, y, movePoints, owner }) => ({
    x,
    y,
    movePoints,
    owner,
  })),
  resources: economy().resources,
});

describe('same command from UI and AI', () => {
  it('a map click and a scripted command give the same result', () => {
    const viaClick = setupScene();
    handleMapCellClick(4, 3, {
      humanId: 'p1',
      unit: null,
      building: null,
      selectedUnit: units().units[viaClick],
      selectedBuilding: null,
      buildingTypeToPlace: 'farm',
      unitTypeToSpawn: null,
      reachableCells: null,
      attackableTargets: null,
      buildableCells: [{ x: 4, y: 3 }],
      spawnableCells: null,
      isClickOnCurrentSelection: () => false,
      selectUnit: () => {},
      selectBuilding: () => {},
      selectCell: () => {},
      calculateActionHighlights: () => {},
      move,
      attack,
      build,
      spawn,
      clearSelection: () => {},
      clearHighlight: () => {},
      clearMovement: () => {},
      clearSelectedBuildingForSpawn: () => {},
    });
    const fromClick = outcome();

    const scripted = setupScene();
    build({
      actor: 'p1',
      workerId: scripted,
      buildingType: 'farm',
      x: 4,
      y: 3,
    });

    expect(outcome()).toEqual(fromClick);
    expect(fromClick.farm).toBe('farm');
    const [clickEntry, scriptEntry] = useJournalStore.getState().entries;
    expect(clickEntry.details).toEqual({
      ...scriptEntry.details,
      workerId: viaClick,
    });
    expect(scriptEntry.details).toMatchObject({
      buildingType: 'farm',
      x: 4,
      y: 3,
    });
  });
});
