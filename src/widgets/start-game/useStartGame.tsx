import { useCallback } from 'react';
import { useBuildingsSelectors } from '@entities/buildings';
import { prepareStartArea, useMapStore } from '@entities/maps';
import { useUnitsSelectors } from '@entities/units';
import { useSettingsSelectors } from '@entities/settings';
import { pathExists } from '@features/pathfinding';

const MAX_RETRIES = 10;

export const useStartGame = () => {
  const { spawnUnit } = useUnitsSelectors();
  const { spawnBuilding } = useBuildingsSelectors();
  const { gridColumns, gridRows, mapGenerationMode, customSeed } =
    useSettingsSelectors();

  return useCallback(() => {
    const playerStart = { x: 1, y: 1 };
    const enemyStart = { x: gridColumns - 2, y: gridRows - 2 };

    if (mapGenerationMode === 'fixed') {
      useMapStore.getState().initMap(gridColumns, gridRows, customSeed);
      console.log(`Используем фиксированный сид: ${customSeed}`);
    } else {
      let attempts = 0;
      let found = false;

      while (attempts < MAX_RETRIES && !found) {
        const seed = Math.random();
        useMapStore.getState().initMap(gridColumns, gridRows, seed);
        const currentGrid = useMapStore.getState().grid;

        if (
          currentGrid.length > 0 &&
          pathExists(currentGrid, playerStart, enemyStart)
        ) {
          found = true;
          console.log(
            `Успешная генерация с попытки ${attempts + 1}, сид: ${seed}`,
          );
        }
        attempts++;
      }

      if (!found) {
        console.warn(
          'Не удалось найти проходимую карту за 10 попыток. Используем последнюю.',
        );
      }
    }

    prepareStartArea(playerStart.x, playerStart.y);
    prepareStartArea(enemyStart.x, enemyStart.y);

    spawnBuilding('base', playerStart.x, playerStart.y, 'player');
    spawnBuilding('base', enemyStart.x, enemyStart.y, 'ai');

    spawnUnit('worker', 2, 1, 'player', true);
    spawnUnit('worker', gridColumns - 3, gridRows - 2, 'ai');
  }, [
    customSeed,
    gridColumns,
    gridRows,
    mapGenerationMode,
    spawnBuilding,
    spawnUnit,
  ]);
};
