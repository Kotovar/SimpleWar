import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { gameEvents } from '@shared/lib';
import type { Owner, UnitType } from '@shared/config';
import { useUnitsStore } from './unitsStore';

let events: unknown[];
let unsubscribe: (() => void) | undefined;

const spawn = (type: UnitType, owner: Owner = 'player') => {
  const id = useUnitsStore.getState().spawnUnit(type, 2, 3, owner);
  if (id === null) throw new Error(`Не удалось создать юнита ${type}`);
  return id;
};

beforeEach(() => {
  useUnitsStore.getState().resetStore();
  events = [];
  unsubscribe = gameEvents.subscribe(event => events.push(event));
});

afterEach(() => unsubscribe?.());

describe('useUnitsStore', () => {
  it('создаёт юнита и публикует событие', () => {
    const id = spawn('worker', 'ai');

    expect(useUnitsStore.getState().units[id]).toMatchObject({
      type: 'worker',
      owner: 'ai',
      x: 2,
      y: 3,
    });
    expect(events).toMatchObject([
      { type: 'UNIT_SPAWNED', owner: 'ai', unit: { type: 'worker' } },
    ]);
  });

  it('перемещает юнита только при целой положительной цене в пределах очков', () => {
    const id = spawn('worker');
    useUnitsStore.getState().resetUnitsForNewTurn();

    useUnitsStore.getState().moveUnit(id, 4, 5, 2);
    expect(useUnitsStore.getState().units[id]).toMatchObject({
      x: 4,
      y: 5,
      movePoints: 2,
    });

    for (const cost of [0, -1, 1.5, 3]) {
      useUnitsStore.getState().moveUnit(id, 8, 9, cost);
    }
    expect(useUnitsStore.getState().units[id]).toMatchObject({
      x: 4,
      y: 5,
      movePoints: 2,
    });
    expect(useUnitsStore.getState().getUnitAt(4, 5)?.id).toBe(id);
  });

  it('наносит урон, удаляет погибшего юнита и сообщает о смерти', () => {
    const id = spawn('archer', 'ai');
    const hp = useUnitsStore.getState().units[id].hp;

    useUnitsStore.getState().damageUnit(id, 5);
    expect(useUnitsStore.getState().units[id].hp).toBe(hp - 5);

    useUnitsStore.getState().damageUnit(id, hp);
    expect(useUnitsStore.getState().units[id]).toBeUndefined();
    expect(events).toMatchObject([
      { type: 'UNIT_SPAWNED', owner: 'ai' },
      { type: 'UNIT_DESTROYED', owner: 'ai', unit: { type: 'archer' } },
    ]);
  });

  it('обнуляет движение после действия и возвращает очки в начале хода', () => {
    const workerId = spawn('worker');
    const archerId = spawn('archer');
    const store = useUnitsStore.getState();
    store.resetUnitsForNewTurn();
    store.changeBuildPoints(workerId);
    store.changeAttackPoints(archerId);

    expect(useUnitsStore.getState().units[workerId]).toMatchObject({
      buildPoints: 0,
      movePoints: 0,
    });
    expect(useUnitsStore.getState().units[archerId]).toMatchObject({
      attackPoints: 0,
      movePoints: 0,
    });

    useUnitsStore.getState().resetUnitsForNewTurn();
    expect(useUnitsStore.getState().units[workerId]).toMatchObject({
      buildPoints: 1,
      movePoints: 4,
    });
    expect(useUnitsStore.getState().units[archerId]).toMatchObject({
      attackPoints: 1,
      movePoints: 3,
    });
  });

  it('не создаёт неизвестного юнита и очищает выбор и список', () => {
    expect(
      useUnitsStore.getState().spawnUnit('unknown' as UnitType, 0, 0, 'player'),
    ).toBeNull();
    expect(events).toEqual([]);

    spawn('worker');
    useUnitsStore.getState().selectUnitForSpawn('archer');
    useUnitsStore.getState().resetStore();
    expect(useUnitsStore.getState()).toMatchObject({
      units: {},
      selectedUnitForSpawn: null,
    });
  });
});
