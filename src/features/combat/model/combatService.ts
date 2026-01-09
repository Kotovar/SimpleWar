import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { gameEvents } from '@shared/lib';

export const attack = (attackerId: string, targetId: string) => {
  const unitsStore = useUnitsStore.getState();
  const buildingsStore = useBuildingsStore.getState();

  const attackerUnit = unitsStore.units[attackerId];
  const attackerBuilding = buildingsStore.buildings[attackerId];
  const attacker = attackerUnit ?? attackerBuilding;

  if (!attacker) return;

  const targetUnit = unitsStore.units[targetId];
  const targetBuilding = buildingsStore.buildings[targetId];
  const target = targetUnit ?? targetBuilding;

  if (!target) return;

  if (attacker.owner === target.owner) return;

  const damage = attacker.attack;

  if ('attackPoints' in attacker && attacker.attackPoints <= 0) return;

  if (targetUnit) {
    unitsStore.damageUnit(targetId, damage);
  } else if (targetBuilding) {
    buildingsStore.damageBuilding(targetId, damage);

    const owner = targetBuilding.owner;
    const wasDestroyedBy = buildingsStore.checkBaseDestroyed();

    if (wasDestroyedBy) {
      gameEvents.emit({
        type: 'BASE_DESTROYED',
        owner,
      });
    }
  }

  if (attackerUnit) {
    unitsStore.changeAttackPoints(attackerId);
  } else if (attackerBuilding) {
    buildingsStore.changeAttackPoints(attackerId);
  }
};
