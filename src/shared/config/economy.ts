import type { Player } from './gameLoop';

type Resource = 'gold' | 'wood';

/** Набор ресурсов игрока с текущими значениями. */
export type Resources = Record<Resource, number>;

/** Лимит населения: максимум и занятое значение. */
export type PopulationCap = {
  max: number;
  occupied: number;
};

/** Максимально возможный лимит населения. */
export const MAX_POPULATION_LIMIT = 30;

/** Начальные ресурсы на старте игры. */
export const START_RESOURCES: Record<Player, Resources> = {
  player: { gold: 200, wood: 120 },
  ai: { gold: 200, wood: 120 },
};

/** Лимит населения по умолчанию на старте. */
export const START_POPULATION_CAP_DEFAULT = 10;

/** Начальные лимиты населения для каждой стороны. */
export const START_POPULATION_CAPS: Record<Player, PopulationCap> = {
  player: { max: START_POPULATION_CAP_DEFAULT, occupied: 0 },
  ai: { max: START_POPULATION_CAP_DEFAULT, occupied: 0 },
};

/** Стоимость постройки здания или юнита. */
export type Cost = {
  gold: number;
  wood: number;
};
