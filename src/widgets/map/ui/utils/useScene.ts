import { useMemo } from 'react';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapViewer } from '@entities/settings';
import { useParticipantKnowledge } from '@entities/perceptions';
import { getHumanId, useGameLoopStore } from '@entities/games';
import { buildScene, getKnownGrid } from '@widgets/map/lib';

/**
 * Сцена карты глазами смотрящего: человека, выбранного в отладке участника
 * или полного обзора. Все слои и мини-карта рисуют только её.
 */
export const useScene = () => {
  const humanId = useGameLoopStore(state => getHumanId(state.participants));
  const viewer = useMapViewer(humanId);
  const knowledge = useParticipantKnowledge(viewer === 'world' ? null : viewer);
  const grid = useMapStore(state => state.grid);
  const units = useUnitsStore(state => state.units);
  const buildings = useBuildingsStore(state => state.buildings);

  // Известная местность меняется только с новыми разведанными клетками.
  const terrain = knowledge?.terrain;
  const width = knowledge?.width ?? 0;
  const knownGrid = useMemo(
    () =>
      viewer === 'world'
        ? grid
        : getKnownGrid(grid, terrain && { width, terrain }),
    [grid, terrain, viewer, width],
  );

  const scene = useMemo(
    () =>
      buildScene(
        { grid, units, buildings },
        viewer === 'world'
          ? { mode: 'world' }
          : { mode: 'participant', viewer, knowledge },
        knownGrid,
      ),
    [buildings, grid, knowledge, knownGrid, units, viewer],
  );

  return { scene, viewer, humanId };
};
