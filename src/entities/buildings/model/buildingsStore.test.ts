import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { gameEvents } from '@shared/lib';
import type { BuildingType, Owner } from '@shared/config';
import { useBuildingsStore } from './buildingsStore';

let events: unknown[];
let unsubscribe: (() => void) | undefined;

const spawn = (type: BuildingType, owner: Owner = 'p1') => {
  const id = useBuildingsStore.getState().spawnBuilding(type, 2, 3, owner);
  if (id === null) throw new Error(`Не удалось создать здание ${type}`);
  return id;
};

beforeEach(() => {
  useBuildingsStore.getState().resetStore();
  events = [];
  unsubscribe = gameEvents.subscribe(event => events.push(event));
});

afterEach(() => unsubscribe?.());

describe('useBuildingsStore', () => {
  it('создаёт здание, находит его по клетке и сообщает о создании', () => {
    const id = spawn('mine', 'p2');

    expect(useBuildingsStore.getState().getBuildingAt(2, 3)).toMatchObject({
      id,
      type: 'mine',
      owner: 'p2',
    });
    expect(useBuildingsStore.getState().getBuildingAt(0, 0)).toBeNull();
    expect(events).toMatchObject([
      { type: 'BUILDING_SPAWNED', owner: 'p2', building: { type: 'mine' } },
    ]);
  });

  it('увеличивает урон и удаляет здание после последнего здоровья', () => {
    const id = spawn('base');
    const initialHp = useBuildingsStore.getState().buildings[id].hp;

    useBuildingsStore.getState().damageBuilding(id, 10);
    expect(useBuildingsStore.getState().buildings[id].hp).toBe(initialHp - 10);

    useBuildingsStore.getState().damageBuilding(id, initialHp);
    expect(useBuildingsStore.getState().buildings[id]).toBeUndefined();
    expect(events).toMatchObject([
      { type: 'BUILDING_SPAWNED' },
      {
        type: 'BUILDING_DESTROYED',
        owner: 'p1',
        building: { type: 'base' },
      },
    ]);
  });

  it('фильтрует здания по владельцу и роли', () => {
    spawn('base');
    spawn('mine');
    spawn('sawmill', 'p2');
    spawn('farm');
    spawn('barracks');
    spawn('tower');

    const store = useBuildingsStore.getState();
    expect(store.getEconomicBuildings('p1').map(({ type }) => type)).toEqual([
      'base',
      'mine',
    ]);
    expect(store.getLimitBuildings('p1').map(({ type }) => type)).toEqual([
      'farm',
    ]);
    expect(store.getProductionBuildings('p1').map(({ type }) => type)).toEqual([
      'base',
      'barracks',
    ]);
  });

  it('расходует и восстанавливает очки действий, очищая выбор спавна', () => {
    const towerId = spawn('tower');
    const baseId = spawn('base');
    const store = useBuildingsStore.getState();

    store.resetBuildingsForNewTurn('p1');
    store.changeAttackPoints(towerId);
    store.changeAttackPoints(towerId);
    store.changeSpawnPoints(baseId);
    store.selectBuildingForSpawn('barracks');

    expect(useBuildingsStore.getState().buildings[towerId]).toMatchObject({
      attackPoints: 0,
    });
    expect(useBuildingsStore.getState().buildings[baseId]).toMatchObject({
      spawnPoints: 0,
    });

    useBuildingsStore.getState().resetBuildingsForNewTurn('p1');
    expect(useBuildingsStore.getState().buildings[towerId]).toMatchObject({
      attackPoints: 1,
    });
    expect(useBuildingsStore.getState().buildings[baseId]).toMatchObject({
      spawnPoints: 1,
    });
    expect(useBuildingsStore.getState().selectedBuildingForSpawn).toBeNull();
  });

  it('не создаёт неизвестное здание и очищает стор', () => {
    expect(
      useBuildingsStore
        .getState()
        .spawnBuilding('unknown' as BuildingType, 0, 0, 'p1'),
    ).toBeNull();
    expect(useBuildingsStore.getState().buildings).toEqual({});
    expect(events).toEqual([]);

    spawn('farm');
    useBuildingsStore.getState().selectBuildingForSpawn('farm');
    useBuildingsStore.getState().resetStore();
    expect(useBuildingsStore.getState()).toMatchObject({
      buildings: {},
      selectedBuildingForSpawn: null,
    });
  });
});
