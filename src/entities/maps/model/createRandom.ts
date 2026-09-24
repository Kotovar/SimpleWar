/**
 * Создаёт детерминированный генератор псевдослучайных чисел (LCG).
 *
 * @param seed - Зерно от 0 до 1; без него берётся `Math.random()`.
 * @returns Функция, возвращающая следующее число в диапазоне [0, 1).
 */
export const createRandom = (seed: number | undefined) => {
  let randomState = Math.floor((seed ?? Math.random()) * 0xffffffff) >>> 0;

  return () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };
};
