import type {
  Building,
  Participant,
  ParticipantId,
  Unit,
} from '@shared/config';
import { isHostile } from './relations';

/** Соседний вражеский источник обзора раскрывает разведчика всем. */
export const isScoutExposed = (
  scout: Unit,
  viewers: readonly (Unit | Building)[],
  participants: readonly Participant[],
) =>
  viewers.some(
    viewer =>
      viewer.sightRange > 0 &&
      isHostile(scout.owner, viewer.owner, participants) &&
      Math.abs(viewer.x - scout.x) + Math.abs(viewer.y - scout.y) <= 1,
  );

/** Замаскированные враги; свои и союзные разведчики всегда доступны. */
export const getConcealedIds = (
  observer: ParticipantId,
  units: readonly Unit[],
  buildings: readonly Building[],
  participants: readonly Participant[],
) => {
  const viewers = [...units, ...buildings];
  return new Set(
    units
      .filter(
        unit =>
          unit.type === 'scout' &&
          unit.concealed &&
          isHostile(observer, unit.owner, participants) &&
          !isScoutExposed(unit, viewers, participants),
      )
      .map(unit => unit.id),
  );
};
