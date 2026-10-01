import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useEconomyStore } from '@entities/economies';
import { useResearchStore } from '@entities/researches';
import {
  getContactConfidence,
  getKnownCellType,
  getParticipantKnowledge,
  type Contact,
  type Observation,
} from '@entities/perceptions';
import { FORMATION_ARMOR, type ParticipantId } from '@shared/config';
import { hasFormationNeighbor } from '@shared/lib';

export type { Observation, RememberedContact } from '@entities/perceptions';

/**
 * Собирает наблюдение участника из его знаний и его собственных объектов.
 *
 * @param participant - Наблюдающий участник.
 * @returns Наблюдение; без знаний — только свои объекты на пустой карте.
 */
export const getObservation = (participant: ParticipantId): Observation => {
  const knowledge = getParticipantKnowledge(participant);
  const turn = useGameLoopStore.getState().currentTurn;
  const width = knowledge?.width ?? 0;
  const height = knowledge?.height ?? 0;
  const isOwn = ({ owner }: { owner: ParticipantId }) => owner === participant;

  const knownTerrain = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => getKnownCellType(knowledge, x, y)),
  );
  const visible = Array.from({ length: height }, (_, y) =>
    Array.from(
      { length: width },
      (_, x) => knowledge?.visible[y * width + x] === 1,
    ),
  );
  const resources = knownTerrain.flatMap((row, y) =>
    row.flatMap((type, x) =>
      type === 'gold' || type === 'forest' ? [{ x, y, type }] : [],
    ),
  );

  const contacts = Object.values(knowledge?.contacts ?? {});
  const isVisibleNow = (contact: Contact) =>
    contact.seenTurn === turn && visible[contact.y]?.[contact.x];

  const economy = useEconomyStore.getState();
  const research = useResearchStore.getState();
  const seen = contacts
    .filter(isVisibleNow)
    .map(({ seenTurn: _seen, ...enemy }) => enemy);
  // Строй врага публичен, как значок на карте: по видимым соседям.
  const visibleEnemies = seen.map(enemy =>
    research.completed[enemy.owner]?.includes('formation') &&
    hasFormationNeighbor(enemy, seen)
      ? { ...enemy, armorBonus: FORMATION_ARMOR }
      : enemy,
  );

  return {
    participant,
    turn,
    stock: { ...economy.resources[participant] },
    population: { ...economy.populationCap[participant] },
    width,
    height,
    ownUnits: Object.values(useUnitsStore.getState().units).filter(isOwn),
    ownBuildings: Object.values(useBuildingsStore.getState().buildings).filter(
      isOwn,
    ),
    visibleEnemies,
    knownTerrain,
    visible,
    resources,
    contacts: contacts
      .filter(contact => !isVisibleNow(contact))
      .map(contact => ({
        ...contact,
        confidence: getContactConfidence(contact, turn),
      })),
    strikes: Object.values(knowledge?.strikes ?? {}),
    researched: [...(research.completed[participant] ?? [])],
    researching: research.current[participant]?.type ?? null,
  };
};
