import { useGameLoopStore } from '@entities/games';
import {
  BUILDINGS_CONFIG,
  type ParticipantId,
  type Position,
} from '@shared/config';
import {
  createExplorationDanger,
  getConcealedIds,
  isHostile,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { getParticipantKnowledge } from '@entities/perceptions';

/**
 * Клетки, куда авторазведка не заходит: у видимых вражеских бойцов и у
 * известных вражеских зданий — дальность их атаки плюс запас. Рабочие
 * отпора не дают и не мешают.
 *
 * @returns Глубина опасности клетки, индекс `y * width + x`: `0` — безопасно,
 * больше — ближе к угрозе.
 */
export const getExplorationDanger = (
  actor: ParticipantId,
  width: number,
  height: number,
  visible: ArrayLike<number>,
) => {
  const { participants } = useGameLoopStore.getState();
  const concealed = getConcealedIds(
    actor,
    Object.values(useUnitsStore.getState().units),
    Object.values(useBuildingsStore.getState().buildings),
    participants,
  );
  const sources: (Position & { range: number })[] = [];
  for (const unit of Object.values(useUnitsStore.getState().units)) {
    if (
      unit.role === 'military' &&
      isHostile(actor, unit.owner, participants) &&
      !concealed.has(unit.id) &&
      visible[unit.y * width + unit.x]
    )
      sources.push({ ...unit, range: unit.attackRange });
  }
  for (const contact of Object.values(
    getParticipantKnowledge(actor)?.contacts ?? {},
  )) {
    if (
      contact.kind !== 'building' ||
      !isHostile(actor, contact.owner, participants)
    )
      continue;
    const config =
      BUILDINGS_CONFIG[contact.type as keyof typeof BUILDINGS_CONFIG];
    const attackRange =
      config && 'attackRange' in config ? config.attackRange : 0;
    sources.push({ ...contact, range: attackRange });
  }
  return createExplorationDanger(width, height, sources);
};
