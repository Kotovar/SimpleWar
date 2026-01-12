import type { Player } from './gameLoop';

type Resource = 'gold' | 'wood';

export type Resources = Record<Resource, number>;

export type PopulationCap = {
  max: number;
  occupied: number;
};

export const MAX_POPULATION_LIMIT = 30;

export const START_RESOURCES: Record<Player, Resources> = {
  player: { gold: 200, wood: 120 },
  ai: { gold: 200, wood: 120 },
};

export const START_POPULATION_CAP: Record<Player, PopulationCap> = {
  player: { max: 0, occupied: 0 },
  ai: { max: 0, occupied: 0 },
};

export type Cost = {
  gold: number;
  wood: number;
};
