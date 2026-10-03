import type { Owner, Unit } from '@shared/config';

/**
 * Свои юниты, которым ещё есть что сделать в этот ход: шаг либо удар или
 * лечение по доступной цели. Боец без шагов и без цели в дальности не
 * считается — ему нечего делать. Рабочий внутри здания занят добычей.
 * Пропустившие ход, спящие и идущие по приказу исключены независимо от
 * очков и целей; остановленный приказ ждёт решения и считается всегда.
 *
 * @param units - Юниты мира.
 * @param owner - Участник, заканчивающий ход.
 * @param canStep - Есть ли клетка для шага: остатка очков может не хватать
 *   на соседний рельеф (холм, болото).
 * @param hasTarget - Есть ли у бойца видимая цель (враг или раненый свой
 *   для лекаря) в дальности; проверка — по правилам боя и знаниям участника.
 * @returns Юниты, которые ещё могут действовать.
 */
export const getPendingUnits = (
  units: Iterable<Unit>,
  owner: Owner,
  canStep: (unit: Unit) => boolean,
  hasTarget: (unit: Unit) => boolean,
) =>
  [...units].filter(unit => {
    if (unit.owner !== owner || unit.restMode) return false;
    if (unit.order) return !!unit.order.stopped;
    if (unit.role === 'civil') return !unit.workplaceId && canStep(unit);
    return (unit.attackPoints > 0 && hasTarget(unit)) || canStep(unit);
  });
