import {
  HEALING,
  type CommandResult,
  type ParticipantId,
  type Unit,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';

/** Приказ лечения: кто, каким лекарем и какого своего юнита. */
export type HealCommand = {
  actor: ParticipantId;
  healerId: string;
  targetId: string;
};

/**
 * Сколько HP вернёт лечение: не больше недостающего. Лечение — отдельный
 * эффект, а не отрицательный урон: не воскрешает и не превышает maxHP.
 *
 * @param healer - Тип лекаря.
 * @param target - HP цели.
 */
export const getHealAmount = (
  healer: Unit['type'],
  target: Pick<Unit, 'hp' | 'maxHp'>,
) =>
  Math.max(0, Math.min(HEALING[healer]?.amount ?? 0, target.maxHp - target.hp));

/**
 * Свои раненые юниты в дальности лечения лекаря, кроме него самого.
 *
 * @param healer - Лекарь.
 * @param units - Все юниты.
 */
export const getHealTargets = (healer: Unit, units: Iterable<Unit>): Unit[] => {
  if (healer.role !== 'military' || !HEALING[healer.type]) return [];
  return [...units].filter(
    unit =>
      unit.id !== healer.id &&
      unit.owner === healer.owner &&
      unit.hp < unit.maxHp &&
      Math.abs(unit.x - healer.x) + Math.abs(unit.y - healer.y) <=
        healer.attackRange,
  );
};

const validateAndHeal = ({
  actor,
  healerId,
  targetId,
}: HealCommand): CommandResult => {
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  const { units, changeAttackPoints, healUnit } = useUnitsStore.getState();
  const healer = units[healerId];
  if (!healer) return reject('notFound');
  if (healer.owner !== actor) return reject('owner');
  if (healer.role !== 'military' || !HEALING[healer.type]) {
    return reject('actionType');
  }
  if (healer.attackPoints <= 0) return reject('points');

  // Лечатся только живые свои юниты: здание и чужой юнит — не цели.
  const target = units[targetId];
  if (!target) return reject('notFound');
  if (target.owner !== actor || target.id === healer.id) {
    return reject('target');
  }
  const distance =
    Math.abs(healer.x - target.x) + Math.abs(healer.y - target.y);
  if (distance > healer.attackRange) return reject('distance');
  const amount = getHealAmount(healer.type, target);
  if (amount === 0) return reject('target');

  healUnit(targetId, amount);
  // Лечение — боевое действие: атаки нет, движение закончено.
  changeAttackPoints(healerId);
  return ok;
};

/**
 * Лечит своего раненого юнита в дальности лекаря: +HP по конфигурации,
 * не выше максимума; тратит боевое действие.
 *
 * @param command - Участник, лекарь и цель.
 * @returns Успех либо причина отказа; при отказе ничего не расходуется.
 */
export const heal = (command: HealCommand) =>
  runCommand(
    {
      type: 'heal',
      actor: command.actor,
      details: { healerId: command.healerId, targetId: command.targetId },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndHeal(command),
  );
