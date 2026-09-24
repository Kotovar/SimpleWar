import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  MAX_POPULATION_LIMIT,
  START_POPULATION_CAPS,
  START_RESOURCES,
} from '@shared/config';
import type { Player, Resources, PopulationCap } from '@shared/config';

type EconomyState = {
  resources: Record<Player, Resources>;
  populationCap: Record<Player, PopulationCap>;

  addResources: (owner: Player, income: Partial<Resources>) => void;
  removeResources: (owner: Player, cost: Partial<Resources>) => void;
  addUnit: (owner: Player, unitCost: number) => void;
  setPopulationSupply: (owner: Player, supply: number) => void;
  removeUnit: (owner: Player, count: number) => void;
  resetStore: () => void;
};

export const useEconomyStore = create<EconomyState>()(
  immer(set => ({
    resources: START_RESOURCES,
    populationCap: START_POPULATION_CAPS,

    addResources: (owner, income) => {
      set(state => {
        const resource = state.resources[owner];

        if (income.gold) resource.gold += income.gold;
        if (income.wood) resource.wood += income.wood;
      });
    },

    removeResources: (owner, cost) => {
      set(state => {
        const resource = state.resources[owner];

        if (cost.gold) resource.gold -= cost.gold;
        if (cost.wood) resource.wood -= cost.wood;
      });
    },

    addUnit: (owner, unitCost) => {
      set(state => {
        state.populationCap[owner].occupied += unitCost;
      });
    },

    setPopulationSupply: (owner, supply) => {
      set(state => {
        const cap = state.populationCap[owner];
        cap.max = Math.min(MAX_POPULATION_LIMIT, supply);
      });
    },

    removeUnit: (owner, count) => {
      set(state => {
        state.populationCap[owner].occupied -= count;
      });
    },

    resetStore: () => {
      set(state => {
        state.resources = START_RESOURCES;
        state.populationCap = START_POPULATION_CAPS;
      });
    },
  })),
);
