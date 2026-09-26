import { describe, expect, it } from 'vite-plus/test';
import type { Building, Cell, Unit } from '@shared/config';
import { createUnit } from '@entities/units';
import { createBuilding } from '@entities/buildings';
import { observe, type ParticipantKnowledge } from '@entities/perceptions';
import { buildScene } from './buildScene';

const grid: Cell[][] = [
  Array.from({ length: 6 }, (_, x) => ({
    x,
    y: 0,
    type: x === 4 ? ('forest' as const) : ('grass' as const),
    isWalkable: x !== 4,
  })),
];

const mask = (from: number, to: number) =>
  Uint8Array.from({ length: 6 }, (_, x) => (x >= from && x <= to ? 1 : 0));

const own = createUnit('worker', 0, 0, 'p1', false)!;
const seenEnemy = createUnit('archer', 2, 0, 'p2', false)!;
const hiddenEnemy = createUnit('swordsman', 5, 0, 'p2', false)!;
const enemyBase = createBuilding('base', 3, 0, 'p2')!;

const byId = <T extends Unit | Building>(...items: T[]) =>
  Object.fromEntries(items.map(item => [item.id, item]));

const world = {
  grid,
  units: byId<Unit>(own, seenEnemy, hiddenEnemy),
  buildings: byId<Building>(enemyBase),
};

/** Видели 0..3 с базой, затем обзор сузился до 0..2. */
const knowledge = (): ParticipantKnowledge => {
  const first = observe(undefined, {
    visible: mask(0, 3),
    grid,
    enemies: [{ ...enemyBase, kind: 'building' }],
    turn: 1,
    eliminated: [],
  });
  return observe(first, {
    visible: mask(0, 2),
    grid,
    enemies: [{ ...seenEnemy, kind: 'unit' }],
    turn: 2,
    eliminated: [],
  });
};

describe('сцена карты', () => {
  it('рисует своих и видимых врагов, но не скрытых', () => {
    const scene = buildScene(world, {
      mode: 'participant',
      viewer: 'p1',
      knowledge: knowledge(),
    });

    expect(Object.keys(scene.units).sort()).toEqual(
      [own.id, seenEnemy.id].sort(),
    );
    // Живую базу вне обзора заменяет снимок: живой объект не рисуется,
    // значит и его текущая полоса HP.
    expect(scene.buildings).toEqual({});
    expect(scene.snapshots).toMatchObject([
      { id: enemyBase.id, x: 3, seenTurn: 1 },
    ]);
  });

  it('снимок не меняется от скрытого урона живому зданию', () => {
    const damaged = { ...enemyBase, hp: 1 };
    const scene = buildScene(
      { ...world, buildings: byId<Building>(damaged) },
      { mode: 'participant', viewer: 'p1', knowledge: knowledge() },
    );

    expect(scene.snapshots[0].hp).toBe(enemyBase.maxHp);
  });

  it('скрывает неразведанную местность нейтральным полем', () => {
    const scene = buildScene(world, {
      mode: 'participant',
      viewer: 'p1',
      knowledge: knowledge(),
    });

    expect(scene.grid[0][4]).toMatchObject({ type: 'grass' });
    expect(scene.fog).not.toBeNull();
  });

  it('полный обзор показывает весь мир без тумана и снимков', () => {
    const scene = buildScene(world, { mode: 'world' });

    expect(scene.units).toBe(world.units);
    expect(scene.grid[0][4].type).toBe('forest');
    expect(scene.snapshots).toEqual([]);
    expect(scene.fog).toBeNull();
  });

  it('без знаний участник видит только свои объекты', () => {
    const scene = buildScene(world, {
      mode: 'participant',
      viewer: 'p1',
      knowledge: undefined,
    });

    expect(Object.keys(scene.units)).toEqual([own.id]);
  });
});
