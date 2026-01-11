import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  MAX_POPULATION_LIMIT,
  START_POPULATION_CAP,
  START_RESOURCES,
} from '@shared/config';
import type { Player, Resources, PopulationCap } from '@shared/config';

type EconomyState = {
  resources: Record<Player, Resources>;
  populationCap: Record<Player, PopulationCap>;

  addResources: (owner: Player, income: Partial<Resources>) => void;
  removeResources: (owner: Player, income: Partial<Resources>) => void;
  addUnits: (owner: Player, unitCost: number) => void;
  changePopulationSupply: (owner: Player, delta: number) => void;
  setPopulationSupply: (owner: Player, supply: number) => void;
  removeUnits: (owner: Player, count: number) => void;
  resetStore: () => void;
};

export const useEconomyStore = create<EconomyState>()(
  immer(set => ({
    resources: START_RESOURCES,
    populationCap: START_POPULATION_CAP,

    addResources: (owner, income) => {
      set(state => {
        const resource = state.resources[owner];

        if (income.gold) resource.gold += income.gold;
        if (income.wood) resource.wood += income.wood;
      });
    },

    removeResources: (owner, income) => {
      set(state => {
        const resource = state.resources[owner];

        if (income.gold) resource.gold -= income.gold;
        if (income.wood) resource.wood -= income.wood;
      });
    },

    addUnits: (owner, unitCost) => {
      set(state => {
        const cap = state.populationCap[owner];
        const newOccupied = cap.occupied + unitCost;

        if (newOccupied <= cap.max) {
          cap.occupied = newOccupied;
        }
      });
    },

    // TODO: Изменить метод на 1 единственный

    changePopulationSupply: (owner, delta) => {
      set(state => {
        const cap = state.populationCap[owner];
        cap.max = Math.min(MAX_POPULATION_LIMIT, cap.max + delta);
      });
    },

    setPopulationSupply: (owner, supply) => {
      set(state => {
        const cap = state.populationCap[owner];

        cap.max = Math.min(MAX_POPULATION_LIMIT, supply);
      });
    },

    removeUnits: (owner, count) => {
      set(state => {
        const cap = state.populationCap[owner];
        cap.occupied = Math.max(0, cap.occupied - count);
      });
    },

    resetStore: () => {
      set(state => {
        state.resources = START_RESOURCES;
        state.populationCap = START_POPULATION_CAP;
      });
    },
  })),
);
