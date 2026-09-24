import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { MAX_POPULATION_LIMIT } from '@shared/config';
import { useEconomyStore } from './economyStore';

describe('useEconomyStore', () => {
  beforeEach(() => useEconomyStore.getState().resetStore());

  it('изменяет только указанные ресурсы выбранного игрока', () => {
    const store = useEconomyStore.getState();

    store.addResources('player', { gold: 15 });
    store.removeResources('ai', { wood: 20 });

    expect(useEconomyStore.getState().resources).toEqual({
      player: { gold: 215, wood: 120 },
      ai: { gold: 200, wood: 100 },
    });
  });

  it('учитывает юнитов и ограничивает запас населения', () => {
    const store = useEconomyStore.getState();

    store.addUnit('player', 3);
    store.removeUnit('player', 1);
    store.setPopulationSupply('player', MAX_POPULATION_LIMIT + 5);
    store.setPopulationSupply('ai', 4);

    expect(useEconomyStore.getState().populationCap).toEqual({
      player: { max: MAX_POPULATION_LIMIT, occupied: 2 },
      ai: { max: 4, occupied: 0 },
    });
  });

  it('возвращает ресурсы и лимиты к начальным значениям', () => {
    const store = useEconomyStore.getState();
    store.addResources('player', { gold: -50 });
    store.addUnit('ai', 2);
    store.resetStore();

    expect(useEconomyStore.getState().resources).toEqual({
      player: { gold: 200, wood: 120 },
      ai: { gold: 200, wood: 120 },
    });
    expect(useEconomyStore.getState().populationCap).toEqual({
      player: { max: 10, occupied: 0 },
      ai: { max: 10, occupied: 0 },
    });
  });
});
