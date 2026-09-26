import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import type { Owner } from '@shared/config';
import { isHostile } from '@shared/lib';

type Attackable = {
  id: string;
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

  const enemyUnits: Attackable[] = Object.values(units)
    .filter(unit => isHostile(owner, unit.owner))
    .map(unit => ({
      id: unit.id,
      x: unit.x,
      y: unit.y,
      owner: unit.owner,
      kind: 'unit',
    }));

  const enemyBuildings: Attackable[] = Object.values(buildings)
    .filter(building => isHostile(owner, building.owner))
    .map(building => ({
      id: building.id,
      x: building.x,
      y: building.y,
      owner: building.owner,
      kind: 'building',
    }));

  return [...enemyUnits, ...enemyBuildings];
};
