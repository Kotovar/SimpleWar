import { beforeEach, expect, it, vi } from 'vite-plus/test';
import { DEFAULT_PARTICIPANTS, type Cell } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useEconomyStore } from '@entities/economies';
import { useJournalStore } from '@entities/journals';
import { useKnowledgeStore } from '@entities/perceptions';
import { useMapStore } from '@entities/maps';
import { attack, heal } from '@features/combat';
import { move, useMovementStore } from '@features/pathfinding';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import { buildScene } from './buildScene';
import { renderEntitiesLayer } from './renderEntitiesLayer';
import { renderSelectionLayer } from './renderSelectionLayer';
import { handleMapCellOrder } from '../ui/utils/mapClickHandler';

const units = () => useUnitsStore.getState();
const buildings = () => useBuildingsStore.getState();

beforeEach(() => {
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useEconomyStore.getState().resetStore();
  useKnowledgeStore.getState().resetStore();
  useJournalStore.getState().newGame();
  useMovementStore.getState().resetStore();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
    winner: null,
  });
  const grid: Cell[][] = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
});

const setup = () => {
  const healer = units().spawnUnit('healer', 1, 2, 'p1', true)!;
  const worker = units().spawnUnit('worker', 2, 2, 'p1', true)!;
  const mine = buildings().spawnBuilding('mine', 2, 2, 'p1')!;
  useUnitsStore.setState(state => ({
    units: {
      ...state.units,
      [healer]: { ...state.units[healer], attackPoints: 1, movePoints: 0 },
      [worker]: { ...state.units[worker], hp: 5, workplaceId: mine },
    },
  }));
  const scene = buildScene(
    {
      grid: useMapStore.getState().grid,
      units: units().units,
      buildings: buildings().buildings,
    },
    { mode: 'world' },
  );
  useMovementStore.getState().calculateActionHighlights(healer);
  return { healer, worker, mine, scene };
};

/** Записывает текст и назначение прозрачности, остальные операции Canvas пропускает. */
const canvas = () => {
  const alphas: number[] = [];
  const texts: string[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_, key) =>
      key === 'getTransform'
        ? () => ({ a: 1 })
        : key === 'measureText'
          ? () => ({ width: 20 })
          : key === 'fillText'
            ? (text: string) => texts.push(text)
            : () => {},
    set: (_, key, value) => {
      if (key === 'globalAlpha') alphas.push(value);
      return true;
    },
  });
  return { ctx, alphas, texts };
};

it('лечит скрытого внутри здания рабочего кликом и показывает размер лечения', () => {
  const { healer, worker, mine, scene } = setup();
  const selectBuilding = vi.fn();
  const { healTargets } = useMovementStore.getState();
  expect(scene.units[worker]).toBeUndefined();
  expect(healTargets?.map(u => u.id)).toEqual([worker]);
  const { ctx, texts } = canvas();
  renderSelectionLayer(
    ctx,
    scene.buildings,
    scene.units,
    { kind: 'unit', id: healer },
    32,
    { hover: { x: 2, y: 2 }, healTargets },
  );
  expect(texts).toContain('+20');
  handleMapCellOrder(2, 2, {
    humanId: 'p1',
    clicked: { unit: null, building: scene.buildings[mine] },
    selection: {
      unit: units().units[healer],
      building: null,
      buildingTypeToPlace: null,
      unitTypeToSpawn: null,
      isCurrent: () => false,
    },
    highlights: {
      reachable: null,
      attackable: null,
      buildable: null,
      spawnable: null,
      heal: healTargets,
    },
    commands: { move, attack, build, spawn, heal },
    ui: {
      selectUnit: vi.fn(),
      selectBuilding,
      selectCell: vi.fn(),
      calculateActionHighlights: vi.fn(),
      clearSelection: vi.fn(),
      clearMovement: vi.fn(),
      clearHighlight: vi.fn(),
    },
  });
  expect(units().units[worker].hp).toBe(25);
  expect(units().units[healer]).toMatchObject({
    attackPoints: 0,
    movePoints: 0,
  });
  expect(selectBuilding).not.toHaveBeenCalled();
});

it('не приглушает лекаря с доступным лечением внутри здания, приглушает после лечения', () => {
  const { healer, worker, scene } = setup();
  const draw = () => {
    const { ctx, alphas } = canvas();
    renderEntitiesLayer(
      ctx,
      {},
      { [healer]: units().units[healer] },
      32,
      undefined,
      'p1',
      undefined,
      scene.staffed,
      Object.values(units().units),
    );
    return alphas;
  };
  expect(draw()).not.toContain(0.45);
  expect(heal({ actor: 'p1', healerId: healer, targetId: worker }).ok).toBe(
    true,
  );
  expect(draw()).toContain(0.45);
});
