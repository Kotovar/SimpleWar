import { describe, expect, it, vi } from 'vite-plus/test';
import type {
  Building,
  BuildingType,
  CommandResult,
  Owner,
  Position,
  Unit,
  UnitType,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
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

type Overrides = {
  unit?: Unit | null;
  building?: Building | null;
  selectedUnit?: Unit | null;
  selectedBuilding?: Building | null;
  buildingTypeToPlace?: BuildingType | null;
  unitTypeToSpawn?: UnitType | null;
  buildableCells?: Position[];
  reachableCells?: Position[];
  attackableTargets?: Position[];
  spawnableCells?: Position[];
  isCurrent?: () => boolean;
};

/** Контекст клика и плоский доступ к его заглушкам для проверок. */
const makeContext = (o: Overrides = {}) => {
  const done = (): CommandResult => ok;
  const mocks = {
    selectUnit: vi.fn(),
    selectBuilding: vi.fn(),
    selectCell: vi.fn(),
    calculateActionHighlights: vi.fn(),
    clearSelection: vi.fn(),
    clearMovement: vi.fn(),
    clearHighlight: vi.fn(),
    move: vi.fn(done),
    attack: vi.fn(done),
    build: vi.fn(done),
    spawn: vi.fn(done),
  };
  const { move, attack, build, spawn, ...ui } = mocks;
  const ctx: MapClickContext = {
    humanId: 'p1',
    clicked: { unit: o.unit ?? null, building: o.building ?? null },
    selection: {
      unit: o.selectedUnit ?? null,
      building: o.selectedBuilding ?? null,
      buildingTypeToPlace: o.buildingTypeToPlace ?? null,
      unitTypeToSpawn: o.unitTypeToSpawn ?? null,
      isCurrent: o.isCurrent ?? (() => false),
    },
    highlights: {
      reachable: o.reachableCells ?? null,
      attackable: o.attackableTargets ?? null,
      buildable: o.buildableCells ?? null,
      spawnable: o.spawnableCells ?? null,
    },
    commands: { move, attack, build, spawn },
    ui,
  };
  return { ctx, ...mocks };
};

describe('handleMapCellClick', () => {
  it('selects an own unit and calculates its movement', () => {
    const unit = unitAt('swordsman', 1, 1);
    const ctx = makeContext({ unit });

    handleMapCellClick(1, 1, ctx.ctx);

    expect(ctx.selectUnit).toHaveBeenCalledWith(unit.id);
    expect(ctx.calculateActionHighlights).toHaveBeenCalledWith(unit.id);
  });

  it('selects an empty cell when nothing is selected', () => {
    const ctx = makeContext();

    handleMapCellClick(2, 3, ctx.ctx);

    expect(ctx.selectCell).toHaveBeenCalledWith(2, 3);
    // Выбор под курсором сам не снимает подсветку стройки/найма.
    expect(ctx.clearHighlight).not.toHaveBeenCalled();
  });

  it('clears selection on a repeated click without acting', () => {
    const selectedUnit = unitAt('swordsman', 1, 1);
    const ctx = makeContext({
      selectedUnit,
      reachableCells: [{ x: 1, y: 1 }],
      isCurrent: () => true,
    });

    handleMapCellClick(1, 1, ctx.ctx);

    expect(ctx.clearSelection).toHaveBeenCalled();
    expect(ctx.move).not.toHaveBeenCalled();
  });

  it('only clears selection when an enemy unit is selected', () => {
    const ctx = makeContext({
      selectedUnit: unitAt('swordsman', 1, 1, 'p2'),
      reachableCells: [{ x: 2, y: 1 }],
    });

    handleMapCellClick(2, 1, ctx.ctx);

    expect(ctx.clearSelection).toHaveBeenCalled();
    expect(ctx.move).not.toHaveBeenCalled();
  });

  it('moves the selected unit to a reachable cell', () => {
    const selectedUnit = unitAt('swordsman', 1, 1);
    const ctx = makeContext({ selectedUnit, reachableCells: [{ x: 2, y: 1 }] });

    handleMapCellClick(2, 1, ctx.ctx);

    expect(ctx.move).toHaveBeenCalledWith({
      actor: 'p1',
      unitId: selectedUnit.id,
      x: 2,
      y: 1,
    });
    expect(ctx.clearSelection).toHaveBeenCalled();
  });

  it('does not move a unit without move points', () => {
    const selectedUnit = { ...unitAt('swordsman', 1, 1), movePoints: 0 };
    const ctx = makeContext({ selectedUnit, reachableCells: [{ x: 2, y: 1 }] });

    handleMapCellClick(2, 1, ctx.ctx);

    expect(ctx.move).not.toHaveBeenCalled();
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

    handleMapCellClick(5, 5, ctx.ctx);

    expect(ctx.move).not.toHaveBeenCalled();
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

    handleMapCellClick(3, 1, ctx.ctx);

    expect(ctx.attack).toHaveBeenCalledWith({
      actor: 'p1',
      attackerId: selectedBuilding.id,
      targetId: unit.id,
    });
  });

  it('spawns from a production building only with spawn points', () => {
    const building = buildingAt('barracks', 1, 1);
    if (building.role !== 'production') throw new Error('Нужна казарма');
    const spawnableCells = [{ x: 2, y: 1 }];
    const ready = makeContext({
      selectedBuilding: { ...building, spawnPoints: 1 },
      unitTypeToSpawn: 'archer',
      spawnableCells,
    });
    const empty = makeContext({
      selectedBuilding: { ...building, spawnPoints: 0 },
      unitTypeToSpawn: 'archer',
      spawnableCells,
    });

    handleMapCellClick(2, 1, ready.ctx);
    handleMapCellClick(2, 1, empty.ctx);

    expect(ready.spawn).toHaveBeenCalledWith({
      actor: 'p1',
      buildingId: building.id,
      unitType: 'archer',
      x: 2,
      y: 1,
    });
    expect(ready.clearSelection).toHaveBeenCalled();
    expect(empty.spawn).not.toHaveBeenCalled();
  });

  it('switches selection from an own building to the clicked object', () => {
    const selectedBuilding = buildingAt('barracks', 1, 1);
    const unit = unitAt('worker', 4, 4);
    const onUnit = makeContext({ selectedBuilding, unit });
    const onCell = makeContext({ selectedBuilding });

    handleMapCellClick(4, 4, onUnit.ctx);
    handleMapCellClick(6, 2, onCell.ctx);

    expect(onUnit.clearHighlight).toHaveBeenCalled();
    expect(onUnit.selectUnit).toHaveBeenCalledWith(unit.id);
    expect(onCell.selectCell).toHaveBeenCalledWith(6, 2);
    expect(onCell.spawn).not.toHaveBeenCalled();
  });

  it('attacks a highlighted enemy with a selected military unit', () => {
    const archer = unitAt('archer', 1, 1);
    if (archer.role !== 'military') throw new Error('Нужен военный юнит');
    const selectedUnit = { ...archer, attackPoints: 1 };
    const unit = unitAt('worker', 3, 1, 'p2');
    const m = makeContext({
      selectedUnit,
      unit,
      reachableCells: [{ x: 2, y: 1 }],
      attackableTargets: [{ x: 3, y: 1 }],
    });

    handleMapCellClick(3, 1, m.ctx);

    expect(m.attack).toHaveBeenCalledWith({
      actor: 'p1',
      attackerId: selectedUnit.id,
      targetId: unit.id,
    });
    expect(m.clearSelection).toHaveBeenCalled();
  });

  it('builds the chosen building type on a highlighted cell', () => {
    const selectedUnit = unitAt('worker', 1, 1);
    const m = makeContext({
      selectedUnit,
      buildingTypeToPlace: 'farm',
      buildableCells: [{ x: 2, y: 2 }],
    });

    handleMapCellClick(2, 2, m.ctx);

    expect(m.build).toHaveBeenCalledWith({
      actor: 'p1',
      workerId: selectedUnit.id,
      buildingType: 'farm',
      x: 2,
      y: 2,
    });
  });

  it('does not build without a chosen building type', () => {
    const m = makeContext({
      selectedUnit: unitAt('worker', 1, 1),
      buildableCells: [{ x: 2, y: 2 }],
    });

    handleMapCellClick(2, 2, m.ctx);

    expect(m.build).not.toHaveBeenCalled();
    expect(m.selectCell).toHaveBeenCalledWith(2, 2);
  });

  it('resets the interaction the same way when a command is rejected', () => {
    const m = makeContext({
      selectedUnit: unitAt('swordsman', 1, 1),
      reachableCells: [{ x: 2, y: 1 }],
    });
    m.move.mockReturnValue(reject('points'));

    handleMapCellClick(2, 1, m.ctx);

    expect(m.clearSelection).toHaveBeenCalled();
    expect(m.clearMovement).toHaveBeenCalled();
    expect(m.clearHighlight).toHaveBeenCalled();
  });
});
