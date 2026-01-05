import { useCallback } from 'react';
import { useBuildingsStore } from '@entities/buildings';
import { prepareStartArea, useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { GRID_SIZE } from '@shared/config';

const TEMP_START_SEED = 0.14;
const START_COORDS = {
  player: { x: 1, y: 1 },
  enemy: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
};

export const useStartGame = () => {
  const initMap = useMapStore(state => state.initMap);
  const spawnUnit = useUnitsStore(state => state.spawnUnit);
  const spawnBuilding = useBuildingsStore(state => state.spawnBuilding);

  return useCallback(() => {
    initMap(GRID_SIZE, TEMP_START_SEED);

    prepareStartArea(START_COORDS.player.x, START_COORDS.player.y);
    prepareStartArea(START_COORDS.enemy.x, START_COORDS.enemy.y);

    spawnBuilding(
      'base',
      START_COORDS.player.x,
      START_COORDS.player.y,
      'player',
    );
    spawnBuilding('base', START_COORDS.enemy.x, START_COORDS.enemy.y, 'enemy');

    spawnUnit('swordsman', 2, 1, 'player');
    spawnUnit('swordsman', GRID_SIZE - 3, GRID_SIZE - 2, 'enemy');
  }, [initMap, spawnBuilding, spawnUnit]);
};
