import type { Building, Owner, Position, Unit } from '@shared/config';

const isTargetInReachableCells = (
  reachableCells: Position[] | null,
  gridX: number,
  gridY: number,
) => reachableCells?.some(cell => cell.x === gridX && cell.y === gridY);

const isTargetInAttackRadius = (
  attackableTargets: Position[] | null,
  gridX: number,
  gridY: number,
) => attackableTargets?.some(cell => cell.x === gridX && cell.y === gridY);

const isTargetInBuildableCells = (
  buildableTargets: Position[] | null,
  gridX: number,
  gridY: number,
) => buildableTargets?.some(cell => cell.x === gridX && cell.y === gridY);

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
  clearMovement: () => void,
) => {
  const isReachable = isTargetInReachableCells(reachableCells, gridX, gridY);
  const isAttackable = isTargetInAttackRadius(attackableTargets, gridX, gridY);
  const isBuildable = isTargetInBuildableCells(buildableCells, gridX, gridY);
  const hasTarget = unitAtTarget || buildingAtTarget;

  const isWorker =
    selectedUnit.type === 'worker' && selectedUnit.role === 'civil';

  if (isReachable && selectedUnit.movePoints > 0) {
    moveUnit(selectedUnit.id, gridX, gridY);
    clearSelection();
    clearMovement();
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

    return true;
  }

  if (isWorker && isBuildable) {
    build(selectedUnit.id, gridX, gridY, 'player');
    clearSelection();
    clearMovement();

    return true;
  }

  return false;
};
