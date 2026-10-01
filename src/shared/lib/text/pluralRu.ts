/**
 * Русская форма слова для числа: 1 ход, 2 хода, 5 ходов, 11 ходов, 21 ход.
 *
 * @param count - Число.
 * @param forms - Формы для 1, 2–4 и 5+ (`['ход', 'хода', 'ходов']`).
 */
export const pluralRu = (
  count: number,
  [one, few, many]: readonly [string, string, string],
) => {
  const tens = Math.abs(count) % 100;
  const units = tens % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (units === 1) return one;
  if (units >= 2 && units <= 4) return few;
  return many;
};
