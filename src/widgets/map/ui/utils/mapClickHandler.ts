import type { Building, Owner, Position, Unit } from '@shared/config';

export type MapClickContext = {
  /** Участник, которым управляет интерфейс; его объекты — «свои». */
  humanId: Owner;
  unit: Unit | null;
  building: Building | null;
  selectedUnit: Unit | null;
  selectedBuilding: Building | null;
  reachableCells: Position[] | null;
  attackableTargets: Position[] | null;
  buildableCells: Position[] | null;
  spawnableCells: Position[] | null;
  isClickOnCurrentSelection: (x: number, y: number) => boolean;
  selectUnit: (id: string) => void;
  selectBuilding: (id: string) => void;
  selectCell: (x: number, y: number) => void;
  calculateMovement: (unitId: string) => void;
  moveUnit: (unitId: string, x: number, y: number) => void;
  attack: (attackerId: string, targetId: string) => void;
  build: (unitId: string, x: number, y: number, owner: Owner) => void;
  spawn: (buildingId: string, x: number, y: number, owner: Owner) => void;
  clearSelection: () => void;
  clearHighlight: () => void;
  clearMovement: () => void;
  clearSelectedBuildingForSpawn: () => void;
};

const isTargetInHighlightedCells = (
  highlightedCells: Position[] | null,
  gridX: number,
  gridY: number,
) => !!highlightedCells?.some(cell => cell.x === gridX && cell.y === gridY);

const resetSelection = (ctx: MapClickContext) => {
  ctx.clearSelection();
  ctx.clearMovement();
  ctx.clearHighlight();
};

const handleClickWithoutSelection = (
  gridX: number,
  gridY: number,
  ctx: MapClickContext,
) => {
  const { unit, building } = ctx;
  ctx.clearSelection();
  ctx.clearMovement();

  if (building) {
    ctx.selectBuilding(building.id);
    if (building.owner === ctx.humanId && building.role === 'combat') {
      // TODO: Поменять название функции
      ctx.calculateMovement(building.id);
    }
    return;
  }

  if (unit) {
    ctx.selectUnit(unit.id);
    if (unit.owner === ctx.humanId) ctx.calculateMovement(unit.id);
    return;
  }

  ctx.selectCell(gridX, gridY);
};

const handleClickWithPlayerUnitSelected = (
  selectedUnit: Unit,
  gridX: number,
  gridY: number,
  ctx: MapClickContext,
) => {
  const target = ctx.unit ?? ctx.building;

  if (
    selectedUnit.movePoints > 0 &&
    isTargetInHighlightedCells(ctx.reachableCells, gridX, gridY)
  ) {
    ctx.moveUnit(selectedUnit.id, gridX, gridY);
    resetSelection(ctx);
    return;
  }

  if (
    target &&
    selectedUnit.role !== 'civil' &&
    selectedUnit.attackPoints > 0 &&
    isTargetInHighlightedCells(ctx.attackableTargets, gridX, gridY)
  ) {
    ctx.attack(selectedUnit.id, target.id);
    resetSelection(ctx);
    return;
  }

  if (
    selectedUnit.type === 'worker' &&
    selectedUnit.role === 'civil' &&
    isTargetInHighlightedCells(ctx.buildableCells, gridX, gridY)
  ) {
    ctx.build(selectedUnit.id, gridX, gridY, ctx.humanId);
    resetSelection(ctx);
    return;
  }

  ctx.clearHighlight();
  handleClickWithoutSelection(gridX, gridY, ctx);
};

const handleClickWithPlayerBuildingSelected = (
  selectedBuilding: Building,
  gridX: number,
  gridY: number,
  ctx: MapClickContext,
) => {
  const target = ctx.unit ?? ctx.building;

  if (
    selectedBuilding.role === 'combat' &&
    target &&
    isTargetInHighlightedCells(ctx.attackableTargets, gridX, gridY)
  ) {
    ctx.attack(selectedBuilding.id, target.id);
    resetSelection(ctx);
    return;
  }

  if (
    selectedBuilding.role === 'production' &&
    selectedBuilding.spawnPoints > 0 &&
    isTargetInHighlightedCells(ctx.spawnableCells, gridX, gridY)
  ) {
    ctx.spawn(selectedBuilding.id, gridX, gridY, ctx.humanId);
    resetSelection(ctx);
    ctx.clearSelectedBuildingForSpawn();
    return;
  }

  ctx.clearHighlight();
  handleClickWithoutSelection(gridX, gridY, ctx);
};

/**
 * Выполняет действие по подсвеченной клетке или обновляет выделение.
 *
 * Приоритет действий задан порядком проверок: движение, атака,
 * строительство или найм, затем выбор объекта под курсором.
 *
 * @param gridX - Столбец клетки.
 * @param gridY - Строка клетки.
 * @param ctx - Текущее выделение, подсветки и игровые действия.
 */
export const handleMapCellClick = (
  gridX: number,
  gridY: number,
  ctx: MapClickContext,
) => {
  const { selectedUnit, selectedBuilding } = ctx;

  // Повторный клик по выделению или любой клик при выбранной чужой
  // сущности снимает выделение.
  const selectedOwner = (selectedUnit ?? selectedBuilding)?.owner;
  if (
    ctx.isClickOnCurrentSelection(gridX, gridY) ||
    (selectedOwner !== undefined && selectedOwner !== ctx.humanId)
  ) {
    resetSelection(ctx);
    return;
  }

  if (selectedUnit) {
    handleClickWithPlayerUnitSelected(selectedUnit, gridX, gridY, ctx);
  } else if (selectedBuilding) {
    handleClickWithPlayerBuildingSelected(selectedBuilding, gridX, gridY, ctx);
  } else {
    handleClickWithoutSelection(gridX, gridY, ctx);
  }
};
