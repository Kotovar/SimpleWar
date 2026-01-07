import { Building } from '@entities/buildings';
import { Position, Unit } from '@shared/config';

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
  moveUnit: (unitId: string, x: number, y: number) => void,
  attack: (attackerId: string, targetId: string) => void,
  clearSelection: () => void,
  clearMovement: () => void,
) => {
  const isReachable = isTargetInReachableCells(reachableCells, gridX, gridY);
  const isAttackable = isTargetInAttackRadius(attackableTargets, gridX, gridY);
  const hasTarget = unitAtTarget || buildingAtTarget;

  if (isReachable) {
    moveUnit(selectedUnit.id, gridX, gridY);
    clearSelection();
    clearMovement();
    return true;
  }

  if (isAttackable && hasTarget) {
    const targetId = unitAtTarget?.id ?? buildingAtTarget!.id;
    attack(selectedUnit.id, targetId);
    clearSelection();
    clearMovement();
    return true;
  }

  return false;
};
