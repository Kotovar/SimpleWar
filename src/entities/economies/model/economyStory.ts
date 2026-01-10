import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAX_LIMIT, START_LIMITS, START_RESOURCES } from '@shared/config';
import type { Player, Resources, UnitLimit } from '@shared/config';

type EconomyState = {
  resources: Record<Player, Resources>;
  unitLimit: Record<Player, UnitLimit>;

  addResources: (owner: Player, income: Partial<Resources>) => void;
  removeResources: (owner: Player, income: Partial<Resources>) => void;
  addUnits: (owner: Player, count: number) => void;
  changeUnitLimit: (
    owner: Player,
    deltaMax: number,
    deltaCurrent?: number,
  ) => void;
  removeUnits: (owner: Player, count: number) => void;
  resetStore: () => void;
};

export const useEconomyStore = create<EconomyState>()(
  immer(set => ({
    resources: START_RESOURCES,
    unitLimit: START_LIMITS,

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

    addUnits: (owner, count) => {
      set(state => {
        const limit = state.unitLimit[owner];
        if (limit.current + count <= limit.max) {
          limit.current += count;
        } else {
          throw new Error('Превышен лимит юнитов');
        }
      });
    },

    changeUnitLimit: (owner, deltaMax, deltaCurrent = 0) => {
      set(state => {
        const limit = state.unitLimit[owner];
        limit.max = Math.min(MAX_LIMIT, limit.max + deltaMax);
        limit.current = Math.max(
          0,
          Math.min(limit.max, limit.current + deltaCurrent),
        );
      });
    },

    removeUnits: (owner, count) => {
      set(state => {
        const limit = state.unitLimit[owner];
        limit.current = Math.max(0, limit.current - count);
      });
    },

    resetStore: () => {
      set(state => {
        state.resources = START_RESOURCES;
        state.unitLimit = START_LIMITS;
      });
    },
  })),
);
