import type {
  Building,
  ParticipantId,
  ResearchType,
  Resources,
  Unit,
} from '@shared/config';

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
