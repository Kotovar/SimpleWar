import type {
  Building,
  ParticipantId,
  ResearchType,
  Resources,
  Unit,
} from '@shared/config';

/**
 * Места сторон на конец партии: победитель, затем оставшиеся в игре по
 * числу объектов, затем выбывшие — позже выбывший выше.
 *
 * @param eliminated - Выбывшие в порядке выбывания.
 * @param size - Число юнитов и зданий стороны.
 */
export const getStandings = (
  participants: readonly { id: ParticipantId }[],
  eliminated: readonly ParticipantId[],
  winner: ParticipantId | null,
  size: (id: ParticipantId) => number,
) => {
  const out = new Set(eliminated);
  const alive = participants
    .map(({ id }) => id)
    .filter(id => !out.has(id))
    .sort(
      (a, b) =>
        Number(b === winner) - Number(a === winner) || size(b) - size(a),
    );
  return [...alive, ...[...eliminated].reverse()].map((id, index) => ({
    id,
    place: index + 1,
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
