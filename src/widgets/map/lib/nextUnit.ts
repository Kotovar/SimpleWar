import type { Unit } from '@shared/config';

/** У юнита есть что сделать в этот ход: шаг, удар/лечение или стройка. */
export const hasActions = (unit: Unit) =>
  unit.movePoints > 0 ||
  (unit.role === 'military' ? unit.attackPoints > 0 : unit.buildPoints > 0);

/** Рабочий без работы в здании — ему можно дать дело. */
export const isIdleWorker = (unit: Unit) =>
  unit.role === 'civil' && !unit.workplaceId;

/**
 * Следующий подходящий юнит после текущего выбора. Порядок — по клеткам
 * слева направо и сверху вниз, по кругу: повторное нажатие обходит всех.
 *
 * @param units - Свои видимые юниты.
 * @param currentId - Выбранный сейчас юнит; `null` — начать с первого.
 * @param fits - Условие отбора.
 * @returns Следующий юнит или `null`, если подходящих нет.
 */
export const getNextUnit = (
  units: readonly Unit[],
  currentId: string | null,
  fits: (unit: Unit) => boolean,
) => {
  const order = units
    .filter(fits)
    .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  if (!order.length) return null;
  const index = order.findIndex(unit => unit.id === currentId);
  return order[(index + 1) % order.length];
};
