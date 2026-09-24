import type { Cell, Position } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { generateMap, prepareStartArea, useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useSettingsStore } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import { createMovementPFGrid, getReachableCells } from '@features/pathfinding';

const hasAccessibleResources = (grid: Cell[][], reachable: Position[]) => {
  const resources = new Set<'gold' | 'forest'>();

  // Рабочий строит на соседней клетке, в том числе по диагонали.
  for (const { x, y } of reachable) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const type = grid[y + dy]?.[x + dx]?.type;
        if (type === 'gold' || type === 'forest') resources.add(type);
      }
    }
    if (resources.size === 2) return true;
  }

  return false;
};

export const initializeGame = () => {
  const { gridColumns, gridRows, mapGenerationMode, customSeed } =
    useSettingsStore.getState();
  const { spawnBuilding, buildings } = useBuildingsStore.getState();
  const { spawnUnit } = useUnitsStore.getState();
  // Повторный вызов не должен пересоздать уже начатую партию.
  if (
    useGameLoopStore.getState().phase !== 'setup' ||
    Object.keys(buildings).length
  )
    return false;

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
    return false;
  }
  if (
    mapGenerationMode === 'fixed' &&
    (!Number.isFinite(customSeed) || customSeed < 0 || customSeed > 1)
  ) {
    fail('Укажите сид от 0 до 1.');
    return false;
  }

  const playerStart = { x: 1, y: 1 };
  const enemyStart = { x: gridColumns - 2, y: gridRows - 2 };
  const playerWorker = { x: 2, y: 1 };
  const enemyWorker = { x: gridColumns - 3, y: gridRows - 2 };
  const attempts = mapGenerationMode === 'fixed' ? 1 : 10;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const seed = mapGenerationMode === 'fixed' ? customSeed : Math.random();
    useMapStore.getState().setGrid(generateMap(gridColumns, gridRows, seed));
    prepareStartArea(playerStart.x, playerStart.y);
    prepareStartArea(enemyStart.x, enemyStart.y);

    const { grid } = useMapStore.getState();
    const pfGrid = createMovementPFGrid(grid);

    // Ратуши ещё не созданы, поэтому закрываем их клетки для проверки пути.
    pfGrid.setWalkableAt(playerStart.x, playerStart.y, false);
    pfGrid.setWalkableAt(enemyStart.x, enemyStart.y, false);

    const reachable = getReachableCells(
      pfGrid,
      playerWorker.x,
      playerWorker.y,
      gridColumns * gridRows,
    );
    // Обход не включает стартовую клетку рабочего.
    reachable.push(playerWorker);
    if (
      !reachable.some(
        cell => cell.x === enemyWorker.x && cell.y === enemyWorker.y,
      )
    )
      continue;
    if (!hasAccessibleResources(grid, reachable)) continue;

    // Создаём объекты только после всех проверок карты.
    spawnBuilding('base', playerStart.x, playerStart.y, 'player');
    spawnBuilding('base', enemyStart.x, enemyStart.y, 'ai');
    spawnUnit('worker', playerWorker.x, playerWorker.y, 'player', true);
    spawnUnit('worker', enemyWorker.x, enemyWorker.y, 'ai');
    return true;
  }

  fail(
    'Не найдена карта с проходом между базами и доступом к лесу и золоту. Измените сид или повторите случайную генерацию.',
  );
  return false;
};
