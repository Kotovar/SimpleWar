import { describe, expect, it } from 'vite-plus/test';
import { CONTACT_MEMORY, type Cell } from '@shared/config';
import {
  getCellKnowledge,
  getContactConfidence,
  getKnownCellType,
  observe,
  type ObservationInput,
} from './observe';
import type { Contact } from './types';

const makeGrid = (width: number): Cell[][] => [
  Array.from({ length: width }, (_, x) => ({
    x,
    y: 0,
    type: 'grass' as const,
    isWalkable: true,
  })),
];

/** Видимы клетки строки с `from` по `to` включительно. */
const mask = (width: number, from: number, to: number) =>
  Uint8Array.from({ length: width }, (_, x) => (x >= from && x <= to ? 1 : 0));

const enemy = (x: number, patch: Partial<Contact> = {}) => ({
  id: 'e1',
  kind: 'unit' as const,
  type: 'swordsman' as const,
  owner: 'p2' as const,
  x,
  y: 0,
  hp: 110,
  maxHp: 110,
  ...patch,
});

const input = (patch: Partial<ObservationInput>): ObservationInput => ({
  visible: mask(8, 0, 2),
  grid: makeGrid(8),
  enemies: [],
  turn: 1,
  eliminated: [],
  ...patch,
});

describe('знания участника', () => {
  it('различает видимые, разведанные и неизвестные клетки', () => {
    const first = observe(undefined, input({}));
    const second = observe(first, input({ visible: mask(8, 5, 6) }));

    expect(getCellKnowledge(second, 5, 0)).toBe('visible');
    expect(getCellKnowledge(second, 1, 0)).toBe('explored');
    expect(getCellKnowledge(second, 3, 0)).toBe('unknown');
    expect(getKnownCellType(second, 1, 0)).toBe('grass');
    expect(getKnownCellType(second, 3, 0)).toBeNull();
  });

  it('скрытая расчистка не меняет запомненный рельеф до нового обзора', () => {
    const forest = makeGrid(8);
    forest[0][1].type = 'forest';
    const seen = observe(undefined, input({ grid: forest }));
    const away = observe(seen, input({ visible: mask(8, 5, 6) }));

    // Лес расчищен, пока клетка скрыта: память остаётся прежней.
    const cleared = makeGrid(8);
    const hidden = observe(
      away,
      input({ grid: cleared, visible: mask(8, 5, 6) }),
    );
    expect(getKnownCellType(hidden, 1, 0)).toBe('forest');
    expect(hidden.terrain).toBe(away.terrain);

    const back = observe(hidden, input({ grid: cleared }));
    expect(getKnownCellType(back, 1, 0)).toBe('grass');
  });

  it('запоминает контакт и не двигает его скрытым перемещением', () => {
    const seen = observe(undefined, input({ enemies: [enemy(2)] }));
    const lost = observe(seen, input({ visible: mask(8, 0, 1), turn: 2 }));

    expect(lost.contacts.e1).toMatchObject({ x: 2, hp: 110, seenTurn: 1 });
  });

  it('видимая пустая клетка опровергает контакт', () => {
    const seen = observe(undefined, input({ enemies: [enemy(2)] }));
    const lost = observe(seen, input({ visible: mask(8, 0, 1) }));
    const checked = observe(lost, input({ visible: mask(8, 0, 3) }));

    expect(checked.contacts.e1).toBeUndefined();
  });

  it('контакт с юнитом стареет и забывается по сроку', () => {
    const seen = observe(undefined, input({ enemies: [enemy(2)] }));
    const hidden = { visible: mask(8, 0, 1) };
    const { staleAfter, forgetAfter } = CONTACT_MEMORY;

    const recent = observe(seen, input({ ...hidden, turn: 1 + staleAfter }));
    expect(getContactConfidence(recent.contacts.e1, 1 + staleAfter)).toBe(
      'recent',
    );
    expect(getContactConfidence(recent.contacts.e1, 2 + staleAfter)).toBe(
      'stale',
    );

    const kept = observe(seen, input({ ...hidden, turn: 1 + forgetAfter }));
    expect(kept.contacts.e1).toBeDefined();
    const gone = observe(kept, input({ ...hidden, turn: 2 + forgetAfter }));
    expect(gone.contacts.e1).toBeUndefined();
  });

  it('память здания живёт до проверки места', () => {
    const base = enemy(2, { id: 'b1', kind: 'building', type: 'base' });
    const seen = observe(undefined, input({ enemies: [base] }));
    const later = observe(seen, input({ visible: mask(8, 0, 1), turn: 50 }));

    expect(later.contacts.b1).toMatchObject({ x: 2, seenTurn: 1 });
  });

  it('забывает контакты выбывшего участника', () => {
    const seen = observe(undefined, input({ enemies: [enemy(2)] }));
    const next = observe(
      seen,
      input({ visible: mask(8, 0, 1), eliminated: ['p2'] }),
    );

    expect(next.contacts).toEqual({});
  });

  it('без изменений сохраняет прежние ссылки', () => {
    const seen = observe(undefined, input({ enemies: [enemy(2)] }));
    const again = observe(seen, input({ enemies: [enemy(2)] }));

    expect(again.visible).toBe(seen.visible);
    expect(again.terrain).toBe(seen.terrain);
    expect(again.contacts).toBe(seen.contacts);
  });
});
