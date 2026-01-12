import { useCallback } from 'react';
import { useBuildingsSelectors } from '@entities/buildings';
import { prepareStartArea, useMapStore } from '@entities/maps';
import { useUnitsSelectors } from '@entities/units';
import { useSettingsSelectors } from '@entities/settings';
import { useEconomySelectors } from '@entities/economies';
import { pathExists } from '@features/pathfinding';

const MAX_RETRIES = 10;

export const useStartGame = () => {
  const { spawnUnit } = useUnitsSelectors();
  const { addUnits } = useEconomySelectors();
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
    spawnBuilding('barracks', 0, 0, 'player');
    spawnBuilding('barracks', 1, 0, 'ai');

    // TODO: убрать после запуска игры - пока для теста
    spawnUnit('swordsman', 2, 1, 'player');
    spawnUnit('worker', 2, 2, 'player');
    spawnUnit('archer', gridColumns - 1, gridRows - 2, 'player');
    spawnUnit('swordsman', gridColumns - 3, gridRows - 2, 'ai');
    spawnUnit('archer', gridColumns - 3, gridRows - 1, 'ai');
    spawnUnit('worker', gridColumns - 2, gridRows - 1, 'ai');

    // TODO: убрать после реализации логики спавна юнитов
    addUnits('player', 6);
    addUnits('ai', 6);
  }, [
    addUnits,
    customSeed,
    gridColumns,
    gridRows,
    mapGenerationMode,
    spawnBuilding,
    spawnUnit,
  ]);
};
