import type { ParticipantId, Position } from '@shared/config';
import {
  getConcealedIds,
  getSightSources,
  isBuildableTerrain,
  isCellVisible,
} from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useSitesStore } from '@entities/sites';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';

/** Видимые свободные клетки найма рядом с лагерем; маскировку не выдаёт. */
export const getCampSpawnCells = (
  actor: ParticipantId,
  campId: string,
): Position[] => {
  const camp = useSitesStore.getState().sites[campId];
  if (camp?.type !== 'camp') return [];
  const { grid } = useMapStore.getState();
  const units = Object.values(useUnitsStore.getState().units);
  const buildings = Object.values(useBuildingsStore.getState().buildings);
  const { participants } = useGameLoopStore.getState();
  const viewers = getSightSources(
    actor,
    [...units, ...buildings],
    grid,
    participants,
  );
  if (!isCellVisible(viewers, camp.x, camp.y)) return [];
  const concealed = getConcealedIds(actor, units, buildings, participants);
  const occupied = new Set(
    [...units.filter(u => !concealed.has(u.id)), ...buildings].map(
      e => `${e.x},${e.y}`,
    ),
  );
  const cells: Position[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = camp.x + dx,
        y = camp.y + dy;
      const cell = grid[y]?.[x];
      if (
        cell &&
        isBuildableTerrain('grass', cell.type) &&
        isCellVisible(viewers, x, y) &&
        !occupied.has(`${x},${y}`)
      )
        cells.push({ x, y });
    }
  return cells;
};
