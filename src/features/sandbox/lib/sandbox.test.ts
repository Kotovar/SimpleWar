import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_SANDBOX,
  type AiProfile,
  type Cell,
  type SandboxScenario,
} from '@shared/config';
import { placeForces } from './placeForces';
import { validateScenario } from './validateScenario';

const field = (width: number, height: number, water: string[] = []): Cell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      water.includes(`${x},${y}`)
        ? { x, y, type: 'water', isWalkable: false }
        : { x, y, type: 'grass', isWalkable: true },
    ),
  );

const withSide = (
  patch: Partial<SandboxScenario['sides'][0]>,
): SandboxScenario => ({
  ...DEFAULT_SANDBOX,
  sides: [{ ...DEFAULT_SANDBOX.sides[0], ...patch }, DEFAULT_SANDBOX.sides[1]],
});

describe('validateScenario', () => {
  it('заготовка корректна', () => {
    expect(validateScenario(DEFAULT_SANDBOX)).toBeNull();
  });

  it('два человека — отказ', () => {
    const scenario: SandboxScenario = {
      ...DEFAULT_SANDBOX,
      sides: [
        { ...DEFAULT_SANDBOX.sides[0], controller: 'human' },
        { ...DEFAULT_SANDBOX.sides[1], controller: 'human' },
      ],
    };

    expect(validateScenario(scenario)).toMatch(/одна сторона/);
  });

  it('неизвестный тип и ратуша в составе — отказ', () => {
    expect(
      validateScenario(withSide({ units: { dragon: 1 } as never })),
    ).toMatch(/неизвестный юнит/);
    expect(
      validateScenario(withSide({ buildings: { base: 1 } as never })),
    ).toMatch(/неизвестное здание/);
  });

  it('границы количества: 20 можно, 21 и дробное — нет', () => {
    expect(validateScenario(withSide({ units: { archer: 20 } }))).toBeNull();
    expect(
      validateScenario(withSide({ units: { archer: 21 } })),
    ).not.toBeNull();
    expect(
      validateScenario(withSide({ units: { archer: 1.5 } })),
    ).not.toBeNull();
  });

  it('известный профиль ИИ можно, неизвестный — отказ', () => {
    expect(validateScenario(withSide({ profile: 'defensive' }))).toBeNull();
    expect(
      validateScenario(withSide({ profile: 'reckless' as AiProfile })),
    ).toMatch(/неизвестный профиль/);
  });

  it('отрицательные запасы — отказ', () => {
    expect(
      validateScenario(withSide({ stock: { gold: -1, wood: 0 } })),
    ).toMatch(/запасы/);
  });
});

describe('placeForces', () => {
  const base = { x: 1, y: 1 };

  it('одинаковые входы — одинаковая расстановка', () => {
    const side = { units: { swordsman: 3, archer: 2 }, buildings: { farm: 2 } };
    const first = placeForces(field(10, 10), new Set(['1,1']), base, side);
    const second = placeForces(field(10, 10), new Set(['1,1']), base, side);

    expect(first).toEqual(second);
    expect(first.units).toHaveLength(5);
    expect(first.buildings).toHaveLength(2);
  });

  it('не ставит на занятое и здания не вплотную к ратуше', () => {
    const taken = new Set(['1,1', '2,1']);
    const placed = placeForces(field(8, 8), taken, base, {
      units: { swordsman: 4 },
      buildings: { tower: 2 },
    });
    const cells = [...placed.units, ...placed.buildings].map(
      ({ x, y }) => `${x},${y}`,
    );

    expect(cells).not.toContain('1,1');
    expect(cells).not.toContain('2,1');
    expect(new Set(cells).size).toBe(cells.length);
    for (const b of placed.buildings) {
      expect(
        Math.abs(b.x - base.x) + Math.abs(b.y - base.y),
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('наземный не встаёт на воду, летающий — может', () => {
    // Вокруг ратуши только вода, суша далеко.
    const water: string[] = [];
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) water.push(`${x},${y}`);
    const grid = field(
      5,
      5,
      water.filter(c => c !== '1,1'),
    );
    const placed = placeForces(grid, new Set(['1,1']), base, {
      units: { swordsman: 1, griffon: 1 },
      buildings: {},
    });

    expect(placed.units.map(({ type }) => type)).toEqual(['griffon']);
    expect(placed.skipped).toEqual(['swordsman']);
  });

  it('рудник без золота на карте не ставится', () => {
    const placed = placeForces(field(6, 6), new Set(), base, {
      units: {},
      buildings: { mine: 1 },
    });

    expect(placed.skipped).toEqual(['mine']);
  });

  it('рудник и лесопилка встают на ресурс любой чётности', () => {
    const grid = field(8, 8);
    // Ратуша (1,1) — чётная сумма; ресурсы — нечётная.
    grid[3][0] = { x: 0, y: 3, type: 'gold', isWalkable: false };
    grid[0][3] = { x: 3, y: 0, type: 'forest', isWalkable: false };
    const placed = placeForces(grid, new Set(['1,1']), base, {
      units: {},
      buildings: { mine: 1, sawmill: 1 },
    });

    expect(placed.skipped).toEqual([]);
    expect(placed.buildings).toEqual([
      { type: 'mine', x: 0, y: 3 },
      { type: 'sawmill', x: 3, y: 0 },
    ]);
  });
});
