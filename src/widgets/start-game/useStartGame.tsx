import { useCallback } from 'react';
import { useBuildingsSelectors } from '@entities/buildings';
import { prepareStartArea, useMapStore } from '@entities/maps';
import { useUnitsSelectors } from '@entities/units';
import { useSettingsSelectors } from '@entities/settings';
import { pathExists } from '@features/pathfinding';

const TEMP_START_SEED = 0.14;
const MAX_RETRIES = 10;

export const useStartGame = () => {
  const { spawnUnit } = useUnitsSelectors();
  const { spawnBuilding } = useBuildingsSelectors();
  const { gridColumns, gridRows } = useSettingsSelectors();

  return useCallback(
    (withRandom: boolean = false) => {
      const playerStart = { x: 1, y: 1 };
      const enemyStart = { x: gridColumns - 2, y: gridRows - 2 };

      let attempts = 0;

      if (!withRandom) {
        useMapStore.getState().initMap(gridColumns, gridRows, TEMP_START_SEED);
      } else {
        while (attempts < MAX_RETRIES) {
          const seed = Math.random();

          useMapStore.getState().initMap(gridColumns, gridRows, seed);
          const currentGrid = useMapStore.getState().grid;

          if (currentGrid.length === 0) {
            attempts++;
            continue;
          }

          const exists = pathExists(currentGrid, playerStart, enemyStart);

          console.log(`Попытка ${attempts + 1}: путь существует = ${exists}`);

          if (exists) {
            break;
          }

          attempts++;
        }
      }
      prepareStartArea(playerStart.x, playerStart.y);
      prepareStartArea(enemyStart.x, enemyStart.y);

      spawnBuilding('base', playerStart.x, playerStart.y, 'player');
      spawnBuilding('base', enemyStart.x, enemyStart.y, 'enemy');

      // TODO: убрать после запуска игры - пока для теста
      spawnUnit('swordsman', 2, 1, 'player');
      spawnUnit('archer', gridColumns - 7, gridRows - 2, 'player');
      spawnUnit('swordsman', gridColumns - 3, gridRows - 2, 'enemy');
      spawnUnit('archer', gridColumns - 3, gridRows - 1, 'enemy');
    },
    [gridColumns, gridRows, spawnBuilding, spawnUnit],
  );
};
