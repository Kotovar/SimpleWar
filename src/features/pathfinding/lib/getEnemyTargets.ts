import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import type { Owner } from '@shared/config';

type Attackable = {
  id: string;
  x: number;
  y: number;
  owner: Owner;
  kind: 'unit' | 'building';
};

export const getEnemyTargets = (): Attackable[] => {
  const units = useUnitsStore.getState().units;
  const buildings = useBuildingsStore.getState().buildings;

  const enemyUnits: Attackable[] = Object.values(units)
    .filter(unit => unit.owner === 'ai')
    .map(unit => ({
      id: unit.id,
      x: unit.x,
      y: unit.y,
      owner: unit.owner,
      kind: 'unit',
    }));

  const enemyBuildings: Attackable[] = Object.values(buildings)
    .filter(building => building.owner === 'ai')
    .map(building => ({
      id: building.id,
      x: building.x,
      y: building.y,
      owner: building.owner,
      kind: 'building',
    }));

  return [...enemyUnits, ...enemyBuildings];
};
