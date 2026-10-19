import { describe, expect, it } from 'vite-plus/test';
import { pluralRu } from './pluralRu';

const forms = ['ход', 'хода', 'ходов'] as const;

describe('pluralRu', () => {
  it('склоняет по последним цифрам, 11–14 — особый случай', () => {
    expect(
      [0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map(
        n => `${n} ${pluralRu(n, forms)}`,
      ),
    ).toEqual([
      '0 ходов',
      '1 ход',
      '2 хода',
      '4 хода',
      '5 ходов',
      '11 ходов',
      '12 ходов',
      '14 ходов',
      '21 ход',
      '22 хода',
      '25 ходов',
      '101 ход',
      '111 ходов',
    ]);
  });
});
