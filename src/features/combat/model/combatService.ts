import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { gameEvents, isHostile } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';

/**
 * Наносит урон в пределах дальности и списывает очко атаки.
 *
 * @param attackerId - ID атакующего юнита или здания.
 * @param targetId - ID вражеской цели.
 */
export const attack = (attackerId: string, targetId: string) => {
  const { phase, activePlayer } = useGameLoopStore.getState();

  if (phase !== 'inProgress') return;

  const unitsStore = useUnitsStore.getState();
  const buildingsStore = useBuildingsStore.getState();

  const attackerUnit = unitsStore.units[attackerId];
  const attackerBuilding = buildingsStore.buildings[attackerId];
  const attacker =
    attackerId in unitsStore.units ? attackerUnit : attackerBuilding;

  if (!attacker || (attacker.role !== 'military' && attacker.role !== 'combat'))
    return;

  if (attacker.owner !== activePlayer) return;
  if (attacker.attackPoints <= 0) return;

  const targetUnit = unitsStore.units[targetId];
  const targetBuilding = buildingsStore.buildings[targetId];
  const target = targetUnit ?? targetBuilding;

  if (!target) return;
  if (!isHostile(attacker.owner, target.owner)) return;
  const distance =
    Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
  if (distance > attacker.attackRange) return;

  const damage = attacker.attack;

  if (targetUnit) {
    unitsStore.damageUnit(targetId, damage);
  } else if (targetBuilding) {
    buildingsStore.damageBuilding(targetId, damage);

    // Событие победы возникает только при фактическом уничтожении базы.
    const owner = targetBuilding.owner;
    if (
      targetBuilding.type === 'base' &&
      !useBuildingsStore.getState().buildings[targetId]
    ) {
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
