/**
 * Проверяет сид фиксированной генерации: целое неотрицательное число,
 * которое JS хранит без потери точности (0, 12354, 215412312).
 */
export const isValidSeed = (seed: number) =>
  Number.isSafeInteger(seed) && seed >= 0;

/** Случайный сид для обычной генерации: тоже целое число. */
export const randomSeed = () => Math.floor(Math.random() * 0x100000000);

// Перемешивание битов (финализатор MurmurHash3): соседние сиды дают
// несвязанные состояния генератора.
const mix = (value: number) => {
  let hash = value >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
};

// Без перемешивания 12354 и 12355 дали бы почти одинаковые карты:
// начальные состояния генератора отличались бы на единицу. Старшие биты
// учитываются отдельно, чтобы сиды больше 2³² не совпадали с младшими.
const toState = (seed: number) =>
  mix(mix(seed) ^ mix(Math.floor(seed / 0x100000000) + 0x9e3779b9));

export const createRandom = (seed: number = randomSeed()) => {
  let randomState = toState(seed);

  return () => {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 0x100000000;
  };
};
