import type { Unit } from '@shared/config';

/**
 * У юнита есть что сделать в этот ход: удар/лечение, стройка или шаг.
 *
 * @param canStep - Есть ли клетка для шага: остатка очков может не хватать
 *   на соседний рельеф.
 */
export const hasActions = (unit: Unit, canStep: (unit: Unit) => boolean) =>
  (unit.role === 'military' ? unit.attackPoints > 0 : unit.buildPoints > 0) ||
  canStep(unit);

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
