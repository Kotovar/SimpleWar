import type { Building, Owner, Position, Unit } from '@shared/config';

const isTargetInHighlightedCells = (
  highlightedCells: Position[] | null,
  gridX: number,
  gridY: number,
) => highlightedCells?.some(cell => cell.x === gridX && cell.y === gridY);

export const handleClickWithoutSelectedUnit = (
  unit: Unit | null,
  building: Building | null,
  gridX: number,
  gridY: number,
  selectUnit: (id: string) => void,
  selectBuilding: (id: string) => void,
  selectCell: (x: number, y: number) => void,
  calculateMovement: (unitId: string) => void,
  clearSelection: () => void,
  clearMovement: () => void,
) => {
  clearSelection();
  clearMovement();

  if (building) {
    selectBuilding(building.id);
    return true;
  }

  if (unit) {
    selectUnit(unit.id);
    if (unit.owner === 'player') {
      calculateMovement(unit.id);
    }
    return true;
  }

  selectCell(gridX, gridY);
  return true;
};

export const handleClickWithPlayerUnitSelected = (
  selectedUnit: Unit,
  gridX: number,
  gridY: number,
  unitAtTarget: Unit | null,
  buildingAtTarget: Building | null,
  reachableCells: Position[] | null,
  attackableTargets: Position[] | null,
  buildableCells: Position[] | null,
  moveUnit: (unitId: string, x: number, y: number) => void,
  attack: (attackerId: string, targetId: string) => void,
  build: (selectedUnitId: string, x: number, y: number, owner: Owner) => void,
  clearSelection: () => void,
  clearHighlight: () => void,
  clearMovement: () => void,
) => {
  const isReachable = isTargetInHighlightedCells(reachableCells, gridX, gridY);
  const isAttackable = isTargetInHighlightedCells(
    attackableTargets,
    gridX,
    gridY,
  );
  const isBuildable = isTargetInHighlightedCells(buildableCells, gridX, gridY);
  const hasTarget = unitAtTarget || buildingAtTarget;

  const isWorker =
    selectedUnit.type === 'worker' && selectedUnit.role === 'civil';

  if (isReachable && selectedUnit.movePoints > 0) {
    moveUnit(selectedUnit.id, gridX, gridY);
    clearSelection();
    clearMovement();
    clearHighlight();
    return true;
  }

  if (
    isAttackable &&
    hasTarget &&
    selectedUnit.role !== 'civil' &&
    selectedUnit.attackPoints > 0
  ) {
    const targetId = unitAtTarget?.id ?? buildingAtTarget!.id;
    attack(selectedUnit.id, targetId);
    clearSelection();
    clearMovement();
    clearHighlight();

    return true;
  }

  if (isWorker && isBuildable) {
    build(selectedUnit.id, gridX, gridY, 'player');
    clearSelection();
    clearMovement();
    clearHighlight();

    return true;
  }

  return false;
};

export const handleClickWithPlayerBuildingSelected = (
  selectedBuilding: Building,
  gridX: number,
  gridY: number,
  spawnableCells: Position[] | null,
  spawn: (
    selectedBuildingId: string,
    x: number,
    y: number,
    owner: Owner,
  ) => void,
  clearSelection: () => void,
  clearHighlight: () => void,
  clearMovement: () => void,
  clearSelectedBuildingForSpawn: () => void,
) => {
  const isSpawnable = isTargetInHighlightedCells(spawnableCells, gridX, gridY);
  const isSpawner =
    selectedBuilding.role === 'production' && selectedBuilding.canSpawn;

  if (!isSpawner || !isSpawnable) {
    return false;
  }

  if (selectedBuilding.spawnPoints > 0) {
    spawn(selectedBuilding.id, gridX, gridY, 'player');
    clearSelection();
    clearHighlight();
    clearMovement();
    clearSelectedBuildingForSpawn();
    return true;
  }

  return false;
};
