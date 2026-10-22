import type {
  Building,
  Participant,
  ParticipantId,
  ResearchType,
  Resources,
  Unit,
} from '@shared/config';
import { isHostile } from '@shared/lib';

/**
 * Места сторон на конец партии: победитель, затем оставшиеся в игре по
 * числу объектов, затем выбывшие — позже выбывший выше.
 *
 * @param eliminated - Выбывшие в порядке выбывания.
 * @param size - Число юнитов и зданий стороны.
 */
export const getStandings = (
  participants: readonly Pick<Participant, 'id' | 'team'>[],
  eliminated: readonly ParticipantId[],
  winner: ParticipantId | null,
  size: (id: ParticipantId) => number,
) => {
  const out = new Set(eliminated);
  const won = (id: ParticipantId) =>
    winner !== null && !isHostile(id, winner, participants);
  const alive = participants
    .map(({ id }) => id)
    .filter(id => !out.has(id))
    .sort((a, b) => size(b) - size(a));
  return [...alive, ...[...eliminated].reverse()]
    .sort((a, b) => Number(won(b)) - Number(won(a)))
    .map((id, index) => ({
      id,
      place: won(id) ? 1 : index + 1,
      out: out.has(id),
    }));
};

/** Итоги собственных сил и запасов на конец партии, без скрытых данных противника. */
export const getPlayerResult = (
  player: ParticipantId,
  world: {
    units: Record<string, Unit>;
    buildings: Record<string, Building>;
    resources: Record<ParticipantId, Resources>;
    completed: Partial<Record<ParticipantId, ResearchType[]>>;
  },
) => ({
  units: Object.values(world.units).filter(unit => unit.owner === player)
    .length,
  buildings: Object.values(world.buildings).filter(
    building => building.owner === player,
  ).length,
  gold: world.resources[player].gold,
  wood: world.resources[player].wood,
  research: [...(world.completed[player] ?? [])],
});
