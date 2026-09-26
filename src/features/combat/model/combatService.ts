import type { CommandResult, ParticipantId } from '@shared/config';
import { gameEvents, isHostile, ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';

/** Приказ атаки: кто, чьим юнитом или башней и по какой цели. */
export type AttackCommand = {
  actor: ParticipantId;
  attackerId: string;
  targetId: string;
};

const validateAndAttack = ({
  actor,
  attackerId,
  targetId,
}: AttackCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const unitsStore = useUnitsStore.getState();
  const buildingsStore = useBuildingsStore.getState();

  const attackerUnit = unitsStore.units[attackerId];
  const attackerBuilding = buildingsStore.buildings[attackerId];
  // Индекс Record типизирован как всегда найденный, поэтому выбираем явно.
  const attacker =
    attackerId in unitsStore.units ? attackerUnit : attackerBuilding;

  if (!attacker) return reject('notFound');
  if (attacker.owner !== actor) return reject('owner');
  if (attacker.role !== 'military' && attacker.role !== 'combat') {
    return reject('actionType');
  }
  if (attacker.attackPoints <= 0) return reject('points');

  const targetUnit = unitsStore.units[targetId];
  const targetBuilding = buildingsStore.buildings[targetId];
  const target = targetId in unitsStore.units ? targetUnit : targetBuilding;

  if (!target) return reject('notFound');
  if (!isHostile(actor, target.owner)) return reject('target');
  const distance =
    Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
  if (distance > attacker.attackRange) return reject('distance');

  const damage = attacker.attack;

  if (targetUnit) {
    unitsStore.damageUnit(targetId, damage);
  } else {
    buildingsStore.damageBuilding(targetId, damage);

    // Событие выбывания возникает только при фактическом уничтожении ратуши.
    if (
      targetBuilding.type === 'base' &&
      !useBuildingsStore.getState().buildings[targetId]
    ) {
      gameEvents.emit({ type: 'BASE_DESTROYED', owner: targetBuilding.owner });
    }
  }

  if (attackerUnit) unitsStore.changeAttackPoints(attackerId);
  else buildingsStore.changeAttackPoints(attackerId);

  return ok;
};

/**
 * Наносит урон враждебной цели в пределах дальности и списывает очко атаки.
 *
 * @param command - Участник, атакующий юнит или здание и цель.
 * @returns Успех либо причина отказа; при отказе состояние не меняется.
 */
export const attack = (command: AttackCommand) =>
  runCommand(
    {
      type: 'attack',
      actor: command.actor,
      details: { attackerId: command.attackerId, targetId: command.targetId },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndAttack(command),
  );
