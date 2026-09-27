import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import type { BuildingType, Owner, UnitType } from '@shared/config';
import { getShelteredIds, isHostile } from '@shared/lib';

type Attackable = {
  id: string;
  type: UnitType | BuildingType;
  x: number;
  y: number;
  owner: Owner;
  kind: 'unit' | 'building';
};

/**
 * Собирает юнитов и здания всех враждебных участников для поиска целей атаки.
 *
 * @param owner - Сторона атакующего.
 * @returns Цели с ID, координатами, стороной и видом сущности.
 */
export const getEnemyTargets = (owner: Owner): Attackable[] => {
  const units = useUnitsStore.getState().units;
  const buildings = useBuildingsStore.getState().buildings;

  // Рабочий внутри здания целью не бывает: удар приходится в здание.
  const sheltered = getShelteredIds(
    Object.values(units),
    Object.values(buildings),
  );
  const enemyUnits: Attackable[] = Object.values(units)
    .filter(unit => isHostile(owner, unit.owner) && !sheltered.has(unit.id))
    .map(unit => ({
      id: unit.id,
      type: unit.type,
      x: unit.x,
      y: unit.y,
      owner: unit.owner,
      kind: 'unit',
    }));

  const enemyBuildings: Attackable[] = Object.values(buildings)
    .filter(building => isHostile(owner, building.owner))
    .map(building => ({
      id: building.id,
      type: building.type,
      x: building.x,
      y: building.y,
      owner: building.owner,
      kind: 'building',
    }));

  return [...enemyUnits, ...enemyBuildings];
};
