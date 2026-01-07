import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';

export const attack = (attackerId: string, targetId: string) => {
  const unitsStore = useUnitsStore.getState();
  const buildingsStore = useBuildingsStore.getState();

  const attacker =
    unitsStore.units[attackerId] || buildingsStore.buildings[attackerId];

  if (!attacker) return;

  const targetUnit = unitsStore.units[targetId];
  const targetBuilding = buildingsStore.buildings[targetId];

  if (!targetUnit && !targetBuilding) return;

  const target = targetUnit ?? targetBuilding;

  if (attacker.owner === target.owner) return;

  const damage = attacker.attack;

  if (targetUnit) {
    unitsStore.damageUnit(targetUnit.id, damage);
    return;
  }

  if (targetBuilding) {
    buildingsStore.damageBuilding(targetBuilding.id, damage);
  }
};
