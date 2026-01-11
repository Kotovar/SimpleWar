import type { Player } from './gameLoop';

type Resource = 'gold' | 'wood';

export type Resources = Record<Resource, number>;

export type PopulationCap = {
  supply: number;
  max: number;
  occupied: number;
};

export const MAX_POPULATION_LIMIT = 30;

export const START_RESOURCES: Record<Player, Resources> = {
  player: { gold: 300, wood: 200 },
  ai: { gold: 300, wood: 200 },
};

export const START_POPULATION_CAP: Record<Player, PopulationCap> = {
  player: { supply: 0, max: 10, occupied: 0 },
  ai: { supply: 0, max: 10, occupied: 0 },
};
