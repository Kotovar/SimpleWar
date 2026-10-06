import { describe, expect, it } from 'vite-plus/test';
import {
  FLIP_DURATION,
  getHourglassFrame,
  getHourglassFrames,
  updateHourglasses,
  type Hourglass,
} from './hourglasses';

const update = (
  glasses: ReadonlyMap<string, Hourglass>,
  spent: string[],
  restored: Record<string, boolean | null> = {},
  now = 100,
  instant = false,
) =>
  updateHourglasses(
    glasses,
    new Set(spent),
    id => (id in restored ? restored[id] : false),
    now,
    instant,
  );

describe('updateHourglasses', () => {
  it('новые отходившие пересыпают песок, при первом показе — сразу', () => {
    expect(update(new Map(), ['a']).get('a')).toEqual({
      kind: 'pour',
      start: 100,
    });
    expect(update(new Map(), ['a'], {}, 100, true).get('a')?.start).toBe(
      -Infinity,
    );
  });

  it('переворачивает часы, только когда очки вернулись', () => {
    const pour = new Map([['a', { kind: 'pour', start: 0 } as Hourglass]]);
    expect(update(pour, [], { a: true }).get('a')).toEqual({
      kind: 'flip',
      start: 100,
    });
    // Цель появилась, очки те же: часы прячутся, потом возвращаются полными.
    const hidden = update(pour, [], { a: false });
    expect(hidden.get('a')).toEqual({ kind: 'hidden', start: 0 });
    expect(update(hidden, ['a']).get('a')).toEqual({ kind: 'pour', start: 0 });
    // Новый ход у спрятанных часов: переворачивать нечего.
    expect(update(hidden, [], { a: true }).has('a')).toBe(false);
  });

  it('удаляет часы исчезнувших и завершённый переворот', () => {
    const pour = new Map([['a', { kind: 'pour', start: 0 } as Hourglass]]);
    expect(update(pour, [], { a: null }).size).toBe(0);
    const flip = new Map([['a', { kind: 'flip', start: 0 } as Hourglass]]);
    expect(update(flip, [], { a: true }, FLIP_DURATION).size).toBe(0);
  });
});

describe('getHourglassFrame', () => {
  it('показывает ход пересыпания и переворота', () => {
    expect(getHourglassFrame({ kind: 'pour', start: 0 }, 600, false)).toEqual({
      sand: 0.5,
      flip: 0,
    });
    expect(
      getHourglassFrame({ kind: 'flip', start: 0 }, FLIP_DURATION, false),
    ).toBeNull();
    expect(
      getHourglassFrame({ kind: 'hidden', start: 0 }, 0, false),
    ).toBeNull();
  });

  it('без движения пересыпание сразу завершено', () => {
    expect(getHourglassFrame({ kind: 'pour', start: 0 }, 0, true)).toEqual({
      sand: 1,
      flip: 0,
    });
  });
});

describe('getHourglassFrames', () => {
  it('продолжает анимацию с первого кадра переворота', () => {
    const glasses = new Map<string, Hourglass>([
      ['a', { kind: 'flip', start: 100 }],
    ]);
    // Первый кадр в момент назначения: flip = 0, но часы должны крутиться дальше.
    expect(getHourglassFrames(glasses, 100, false)).toEqual({
      frames: new Map([['a', { sand: 1, flip: 0 }]]),
      animating: true,
    });
  });

  it('пересыпанные часы кадров не требуют', () => {
    const glasses = new Map<string, Hourglass>([
      ['a', { kind: 'pour', start: -Infinity }],
    ]);
    expect(getHourglassFrames(glasses, 100, false).animating).toBe(false);
  });
});
