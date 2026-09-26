import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { MAX_POPULATION_LIMIT } from '@shared/config';
import { useEconomyStore } from './economyStore';

describe('useEconomyStore', () => {
  beforeEach(() => useEconomyStore.getState().resetStore());

  it('изменяет только указанные ресурсы выбранного игрока', () => {
    const store = useEconomyStore.getState();

    store.addResources('p1', { gold: 15 });
    store.removeResources('p2', { wood: 20 });

    expect(useEconomyStore.getState().resources).toMatchObject({
      p1: { gold: 215, wood: 120 },
      p2: { gold: 200, wood: 100 },
    });
  });

  it('учитывает юнитов и ограничивает запас населения', () => {
    const store = useEconomyStore.getState();

    store.addUnit('p1', 3);
    store.removeUnit('p1', 1);
    store.setPopulationSupply('p1', MAX_POPULATION_LIMIT + 5);
    store.setPopulationSupply('p2', 4);

    expect(useEconomyStore.getState().populationCap).toMatchObject({
      p1: { max: MAX_POPULATION_LIMIT, occupied: 2 },
      p2: { max: 4, occupied: 0 },
    });
  });

  it('возвращает ресурсы и лимиты к начальным значениям', () => {
    const store = useEconomyStore.getState();
    store.addResources('p1', { gold: -50 });
    store.addUnit('p2', 2);
    store.resetStore();

    expect(useEconomyStore.getState().resources).toMatchObject({
      p1: { gold: 200, wood: 120 },
      p2: { gold: 200, wood: 120 },
    });
    expect(useEconomyStore.getState().populationCap).toMatchObject({
      p1: { max: 10, occupied: 0 },
      p2: { max: 10, occupied: 0 },
    });
  });
});
