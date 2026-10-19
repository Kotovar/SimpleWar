import { describe, expect, it } from 'vite-plus/test';
import { blocksLastPassage, type AccessMap } from './access';

/**
 * Карта из строк: `#` — стена, `?` — неразведано (проходимо, граница),
 * `B` — ратуша, `F` — своё здание, `.` — поле.
 */
const parse = (rows: string[]): AccessMap => {
  const at = (x: number, y: number) => rows[y]?.[x] ?? '#';
  const find = (mark: string) =>
    rows.flatMap((row, y) =>
      row.split('').flatMap((c, x) => (c === mark ? [{ x, y }] : [])),
    );
  return {
    width: rows[0].length,
    height: rows.length,
    passable: (x, y) => ['.', '?'].includes(at(x, y)),
    isFrontier: (x, y) => at(x, y) === '?',
    buildings: find('F'),
    base: find('B')[0] ?? null,
  };
};

describe('последний проход', () => {
  it('разрешает постройку на открытом месте', () => {
    const map = parse(['.....', '.B...', '.....', '....?']);
    expect(blocksLastPassage(map, { x: 3, y: 1 })).toBe(false);
  });

  it('запрещает закрыть единственный выход из тупика с ратушей', () => {
    const map = parse(['#####', '#B..?', '#####']);
    expect(blocksLastPassage(map, { x: 2, y: 1 })).toBe(true);
    // Соседний проход по диагонали для движения не годится: только 4 стороны.
    expect(blocksLastPassage(map, { x: 3, y: 1 })).toBe(true);
  });

  it('запрещает отрезать своё здание от ратуши', () => {
    const map = parse(['#######', '#B...F#', '#######']);
    expect(blocksLastPassage(map, { x: 3, y: 1 })).toBe(true);
  });

  it('запрещает забрать у здания последнюю свободную клетку', () => {
    const map = parse(['###', '#F.', '###']);
    expect(blocksLastPassage(map, { x: 2, y: 1 })).toBe(true);
  });

  it('при обходе вокруг проход не считается последним', () => {
    const map = parse(['.....', '.B.#?', '.....']);
    expect(blocksLastPassage(map, { x: 2, y: 1 })).toBe(false);
  });

  it('не требует связи с границей, если её не было', () => {
    const map = parse(['#####', '#B...', '#####']);
    expect(blocksLastPassage(map, { x: 3, y: 1 })).toBe(false);
  });
});
