import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';

export const attack = (attackerId: string, targetId: string) => {
  const unitsStore = useUnitsStore.getState();
  const buildingsStore = useBuildingsStore.getState();

  const attackerUnit = unitsStore.units[attackerId];
  const attackerBuilding = buildingsStore.buildings[attackerId];
  const attacker = attackerUnit ?? attackerBuilding;

  if (!attacker) return;

  const targetUnit = unitsStore.units[targetId];
  const targetBuilding = buildingsStore.buildings[targetId];

  if (!targetUnit && !targetBuilding) return;

  const target = targetUnit ?? targetBuilding;

  if (attacker.owner === target.owner) return;

  const damage = attacker.attack;

  if ('attackPoints' in attacker && attacker.attackPoints <= 0) return;

  if (targetUnit) {
    unitsStore.damageUnit(targetUnit.id, damage);
    unitsStore.changeAttackPoints(attacker.id);
    return;
  }

  if (targetBuilding) {
    buildingsStore.damageBuilding(targetBuilding.id, damage);
  }
};
