import type { Owner, Unit } from '@shared/config';

/**
 * Свои юниты, которым ещё есть что сделать в этот ход: шаг либо удар или
 * лечение по доступной цели. Боец без шагов и без цели в дальности не
 * считается — ему нечего делать. Рабочий внутри здания занят добычей.
 *
 * @param units - Юниты мира.
 * @param owner - Участник, заканчивающий ход.
 * @param hasTarget - Есть ли у бойца видимая цель (враг или раненый свой
 *   для лекаря) в дальности; проверка — по правилам боя и знаниям участника.
 * @returns Юниты, которые ещё могут действовать.
 */
export const getPendingUnits = (
  units: Iterable<Unit>,
  owner: Owner,
  hasTarget: (unit: Unit) => boolean,
) =>
  [...units].filter(unit => {
    if (unit.owner !== owner) return false;
    if (unit.role === 'civil') return unit.movePoints > 0 && !unit.workplaceId;
    return unit.movePoints > 0 || (unit.attackPoints > 0 && hasTarget(unit));
  });
