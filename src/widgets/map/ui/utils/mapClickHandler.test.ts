import { describe, expect, it, vi } from 'vite-plus/test';
import type { Building, Owner, Unit } from '@shared/config';
import { createBuilding } from '@entities/buildings';
import { createUnit } from '@entities/units';
import { handleMapCellClick, type MapClickContext } from './mapClickHandler';

const unitAt = (
  type: Unit['type'],
  x: number,
  y: number,
  owner: Owner = 'p1',
) => createUnit(type, x, y, owner, true)!;

const buildingAt = (type: Building['type'], x: number, y: number) =>
  createBuilding(type, x, y, 'p1')!;

const makeContext = (overrides: Partial<MapClickContext> = {}) =>
  ({
    unit: null,
    building: null,
    selectedUnit: null,
    selectedBuilding: null,
    reachableCells: null,
    attackableTargets: null,
    buildableCells: null,
    spawnableCells: null,
    isClickOnCurrentSelection: vi.fn(() => false),
    selectUnit: vi.fn(),
    selectBuilding: vi.fn(),
    humanId: 'p1',
    selectCell: vi.fn(),
    calculateMovement: vi.fn(),
    moveUnit: vi.fn(),
    attack: vi.fn(),
    build: vi.fn(),
    spawn: vi.fn(),
    clearSelection: vi.fn(),
    clearHighlight: vi.fn(),
    clearMovement: vi.fn(),
    clearSelectedBuildingForSpawn: vi.fn(),
    ...overrides,
  }) satisfies MapClickContext;

describe('handleMapCellClick', () => {
  it('selects an own unit and calculates its movement', () => {
    const unit = unitAt('swordsman', 1, 1);
    const ctx = makeContext({ unit });

    handleMapCellClick(1, 1, ctx);

    expect(ctx.selectUnit).toHaveBeenCalledWith(unit.id);
    expect(ctx.calculateMovement).toHaveBeenCalledWith(unit.id);
  });

  it('selects an empty cell when nothing is selected', () => {
    const ctx = makeContext();

    handleMapCellClick(2, 3, ctx);

    expect(ctx.selectCell).toHaveBeenCalledWith(2, 3);
  });

  it('clears selection on a repeated click without acting', () => {
    const selectedUnit = unitAt('swordsman', 1, 1);
    const ctx = makeContext({
      selectedUnit,
      reachableCells: [{ x: 1, y: 1 }],
      isClickOnCurrentSelection: vi.fn(() => true),
    });

    handleMapCellClick(1, 1, ctx);

    expect(ctx.clearSelection).toHaveBeenCalled();
    expect(ctx.moveUnit).not.toHaveBeenCalled();
  });

  it('only clears selection when an enemy unit is selected', () => {
    const ctx = makeContext({
      selectedUnit: unitAt('swordsman', 1, 1, 'p2'),
      reachableCells: [{ x: 2, y: 1 }],
    });

    handleMapCellClick(2, 1, ctx);

    expect(ctx.clearSelection).toHaveBeenCalled();
    expect(ctx.moveUnit).not.toHaveBeenCalled();
  });

  it('moves the selected unit to a reachable cell', () => {
    const selectedUnit = unitAt('swordsman', 1, 1);
    const ctx = makeContext({ selectedUnit, reachableCells: [{ x: 2, y: 1 }] });

    handleMapCellClick(2, 1, ctx);

    expect(ctx.moveUnit).toHaveBeenCalledWith(selectedUnit.id, 2, 1);
    expect(ctx.clearSelection).toHaveBeenCalled();
  });

  it('does not move a unit without move points', () => {
    const selectedUnit = { ...unitAt('swordsman', 1, 1), movePoints: 0 };
    const ctx = makeContext({ selectedUnit, reachableCells: [{ x: 2, y: 1 }] });

    handleMapCellClick(2, 1, ctx);

    expect(ctx.moveUnit).not.toHaveBeenCalled();
    expect(ctx.clearHighlight).toHaveBeenCalled();
    expect(ctx.selectCell).toHaveBeenCalledWith(2, 1);
  });

  it('switches selection from an own unit when the click has no action', () => {
    const selectedUnit = unitAt('swordsman', 1, 1);
    const building = buildingAt('barracks', 5, 5);
    const ctx = makeContext({
      selectedUnit,
      building,
      reachableCells: [{ x: 2, y: 1 }],
    });

    handleMapCellClick(5, 5, ctx);

    expect(ctx.moveUnit).not.toHaveBeenCalled();
    expect(ctx.clearHighlight).toHaveBeenCalled();
    expect(ctx.selectBuilding).toHaveBeenCalledWith(building.id);
  });

  it('attacks a target from a selected combat building', () => {
    const selectedBuilding = buildingAt('tower', 1, 1);
    const unit = unitAt('archer', 3, 1, 'p2');
    const ctx = makeContext({
      selectedBuilding,
      unit,
      attackableTargets: [{ x: 3, y: 1 }],
    });

    handleMapCellClick(3, 1, ctx);

    expect(ctx.attack).toHaveBeenCalledWith(selectedBuilding.id, unit.id);
  });

  it('spawns from a production building only with spawn points', () => {
    const building = buildingAt('barracks', 1, 1);
    if (building.role !== 'production') throw new Error('Нужна казарма');
    const spawnableCells = [{ x: 2, y: 1 }];
    const ready = makeContext({
      selectedBuilding: { ...building, spawnPoints: 1 },
      spawnableCells,
    });
    const empty = makeContext({
      selectedBuilding: { ...building, spawnPoints: 0 },
      spawnableCells,
    });

    handleMapCellClick(2, 1, ready);
    handleMapCellClick(2, 1, empty);

    expect(ready.spawn).toHaveBeenCalledWith(building.id, 2, 1, 'p1');
    expect(ready.clearSelectedBuildingForSpawn).toHaveBeenCalled();
    expect(empty.spawn).not.toHaveBeenCalled();
  });

  it('switches selection from an own building to the clicked object', () => {
    const selectedBuilding = buildingAt('barracks', 1, 1);
    const unit = unitAt('worker', 4, 4);
    const onUnit = makeContext({ selectedBuilding, unit });
    const onCell = makeContext({ selectedBuilding });

    handleMapCellClick(4, 4, onUnit);
    handleMapCellClick(6, 2, onCell);

    expect(onUnit.clearHighlight).toHaveBeenCalled();
    expect(onUnit.selectUnit).toHaveBeenCalledWith(unit.id);
    expect(onCell.selectCell).toHaveBeenCalledWith(6, 2);
    expect(onCell.spawn).not.toHaveBeenCalled();
  });
});
