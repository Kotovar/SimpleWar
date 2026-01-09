import type { Player } from './gameLoop';

type Resource = 'gold' | 'wood';

export type Resources = Record<Resource, number>;
export type UnitLimit = Record<'current' | 'max', number>;

export const MAX_LIMIT = 30;
export const START_RESOURCES: Record<Player, Resources> = {
  player: { gold: 300, wood: 200 },
  ai: { gold: 300, wood: 200 },
};

export const START_LIMITS: Record<Player, UnitLimit> = {
  player: { current: 0, max: 10 },
  ai: { current: 0, max: 10 },
};
