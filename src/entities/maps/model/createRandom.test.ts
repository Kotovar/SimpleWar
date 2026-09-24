import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createRandom } from './createRandom';

afterEach(() => vi.restoreAllMocks());

describe('createRandom', () => {
  it('возвращает воспроизводимую последовательность в диапазоне [0, 1)', () => {
    const values = (seed: number) =>
      Array.from({ length: 8 }, createRandom(seed));
    const sequence = values(0.42);

    expect(values(0.42)).toEqual(sequence);
    expect(values(0.9)).not.toEqual(sequence);
    expect(sequence.every(value => value >= 0 && value < 1)).toBe(true);
  });

  it('берёт Math.random только для начального значения без сида', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    expect(createRandom(undefined)()).toBe(createRandom(0.25)());
    expect(Math.random).toHaveBeenCalledOnce();
  });
});
