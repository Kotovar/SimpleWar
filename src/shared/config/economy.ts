import { PARTICIPANT_IDS, type ParticipantId } from './gameLoop';

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
export const START_RESOURCES = Object.fromEntries(
  PARTICIPANT_IDS.map(id => [id, { gold: 200, wood: 120 }]),
) as Record<ParticipantId, Resources>;

/** Лимит населения по умолчанию на старте. */
export const START_POPULATION_CAP_DEFAULT = 10;

/** Начальные лимиты населения для каждой стороны. */
export const START_POPULATION_CAPS = Object.fromEntries(
  PARTICIPANT_IDS.map(id => [
    id,
    { max: START_POPULATION_CAP_DEFAULT, occupied: 0 },
  ]),
) as Record<ParticipantId, PopulationCap>;

/** Стоимость постройки здания или юнита. */
export type Cost = {
  gold: number;
  wood: number;
};
