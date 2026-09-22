import { useBuildingsStore } from '@entities/buildings';
import { prepareStartArea, useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useSettingsStore } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import {
  createMovementPFGrid,
  getPath,
  getReachableCells,
} from '@features/pathfinding';

export const initializeGame = () => {
  const { gridColumns, gridRows, mapGenerationMode, customSeed } =
    useSettingsStore.getState();
  const { spawnBuilding, buildings } = useBuildingsStore.getState();
  const { spawnUnit } = useUnitsStore.getState();
  if (
    useGameLoopStore.getState().phase !== 'inProgress' ||
    Object.keys(buildings).length
  )
    return;

  const fail = (startError: string) => {
    useMapStore.getState().resetStore();
    useGameLoopStore.setState({ phase: 'setup', currentTurn: 0, startError });
  };

  if (
    !Number.isInteger(gridColumns) ||
    !Number.isInteger(gridRows) ||
    gridColumns < 5 ||
    gridRows < 5
  ) {
    fail('Для старта нужна карта не меньше 5 × 5 клеток.');
    return;
  }
  if (
    mapGenerationMode === 'fixed' &&
    (!Number.isFinite(customSeed) || customSeed < 0 || customSeed > 1)
  ) {
    fail('Укажите сид от 0 до 1.');
    return;
  }

  const playerStart = { x: 1, y: 1 };
  const enemyStart = { x: gridColumns - 2, y: gridRows - 2 };
  const playerWorker = { x: 2, y: 1 };
  const enemyWorker = { x: gridColumns - 3, y: gridRows - 2 };
  const attempts = mapGenerationMode === 'fixed' ? 1 : 10;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const seed = mapGenerationMode === 'fixed' ? customSeed : Math.random();
    useMapStore.getState().initMap(gridColumns, gridRows, seed);
    prepareStartArea(playerStart.x, playerStart.y);
    prepareStartArea(enemyStart.x, enemyStart.y);

    const { grid } = useMapStore.getState();
    const pfGrid = createMovementPFGrid(grid);

    pfGrid.setWalkableAt(playerStart.x, playerStart.y, false);
    pfGrid.setWalkableAt(enemyStart.x, enemyStart.y, false);
    if (!getPath(playerWorker, enemyWorker, pfGrid).length) continue;

    const reachable = getReachableCells(
      pfGrid,
      playerWorker.x,
      playerWorker.y,
      gridColumns * gridRows,
    );
    reachable.push(playerWorker);
    const accessible = new Set(reachable.map(cell => `${cell.x},${cell.y}`));
    const resources = new Set<string>();
    for (const row of grid) {
      for (const cell of row) {
        if (cell.type !== 'gold' && cell.type !== 'forest') continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (accessible.has(`${cell.x + dx},${cell.y + dy}`))
              resources.add(cell.type);
          }
        }
      }
    }
    if (!resources.has('gold') || !resources.has('forest')) continue;

    spawnBuilding('base', playerStart.x, playerStart.y, 'player');
    spawnBuilding('base', enemyStart.x, enemyStart.y, 'ai');
    spawnUnit('worker', playerWorker.x, playerWorker.y, 'player', true);
    spawnUnit('worker', enemyWorker.x, enemyWorker.y, 'ai');
    return;
  }

  fail(
    'Не найдена карта с проходом между базами и доступом к лесу и золоту. Измените сид или повторите случайную генерацию.',
  );
};
