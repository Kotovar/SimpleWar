import { describe, expect, it } from 'vite-plus/test';
import { createRandom, isValidSeed } from './createRandom';

const firstValues = (seed: number) => {
  const random = createRandom(seed);
  return [random(), random(), random()];
};

describe('createRandom', () => {
  it('reproduces a seed and separates neighbours', () => {
    expect(firstValues(215412312)).toEqual(firstValues(215412312));

    const [a] = firstValues(12354);
    const [b] = firstValues(12355);
    expect(Math.abs(a - b)).toBeGreaterThan(0.01);
  });

  it('does not collide seeds above 2^32 with their low bits', () => {
    expect(firstValues(2 ** 32 + 7)).not.toEqual(firstValues(7));
  });
});

describe('isValidSeed', () => {
  it.each([0, 1, 12354, 215412312, Number.MAX_SAFE_INTEGER])(
    'accepts %s',
    seed => expect(isValidSeed(seed)).toBe(true),
  );

  it.each([-1, 0.42, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects %s',
    seed => expect(isValidSeed(seed)).toBe(false),
  );
});
