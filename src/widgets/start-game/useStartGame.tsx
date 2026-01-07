import { useCallback } from 'react';
import { GRID_SIZE } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { prepareStartArea, useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { pathExists } from '@features/pathfinding';

const TEMP_START_SEED = 0.14;
const MAX_RETRIES = 10;

const START_COORDS = {
  player: { x: 1, y: 1 },
  enemy: { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
};

export const useStartGame = () => {
  const spawnUnit = useUnitsStore(state => state.spawnUnit);
  const spawnBuilding = useBuildingsStore(state => state.spawnBuilding);

  return useCallback(
    (withRandom: boolean = false) => {
      let attempts = 0;

      if (!withRandom) {
        useMapStore.getState().initMap(GRID_SIZE, TEMP_START_SEED);
      } else {
        while (attempts < MAX_RETRIES) {
          const seed = Math.random();

          useMapStore.getState().initMap(GRID_SIZE, seed);
          const currentGrid = useMapStore.getState().grid;

          if (currentGrid.length === 0) {
            attempts++;
            continue;
          }

          const exists = pathExists(
            currentGrid,
            START_COORDS.player,
            START_COORDS.enemy,
          );

          console.log(`Попытка ${attempts + 1}: путь существует = ${exists}`);

          if (exists) {
            break;
          }

          attempts++;
        }
      }

      prepareStartArea(START_COORDS.player.x, START_COORDS.player.y);
      prepareStartArea(START_COORDS.enemy.x, START_COORDS.enemy.y);

      spawnBuilding(
        'base',
        START_COORDS.player.x,
        START_COORDS.player.y,
        'player',
      );
      spawnBuilding(
        'base',
        START_COORDS.enemy.x,
        START_COORDS.enemy.y,
        'enemy',
      );

      spawnUnit('swordsman', 2, 1, 'player');
      spawnUnit('archer', GRID_SIZE - 7, GRID_SIZE - 2, 'player');
      spawnUnit('swordsman', GRID_SIZE - 3, GRID_SIZE - 2, 'enemy');
    },
    [spawnBuilding, spawnUnit],
  );
};
