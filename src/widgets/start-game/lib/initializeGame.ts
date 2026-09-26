import {
  DEFAULT_PARTICIPANTS,
  MAP_ATTEMPTS,
  MAX_PARTICIPANTS,
  MIN_MAP_SIDE,
  REJECTION_MESSAGE,
  type Cell,
} from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import {
  generateMap,
  isValidSeed,
  prepareStartArea,
  randomSeed,
  useMapStore,
} from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useSettingsStore } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { failure, reject } from '@shared/lib';
import { evaluateMap, type StartPosition } from './evaluateMap';

/** Углы в порядке слотов: левый верхний, правый нижний, правый верхний, левый нижний. */
export const getStartPositions = (
  width: number,
  height: number,
  count: number,
) =>
  [
    { base: { x: 1, y: 1 }, worker: { x: 2, y: 1 } },
    {
      base: { x: width - 2, y: height - 2 },
      worker: { x: width - 3, y: height - 2 },
    },
    { base: { x: width - 2, y: 1 }, worker: { x: width - 3, y: 1 } },
    { base: { x: 1, y: height - 2 }, worker: { x: 2, y: height - 2 } },
  ].slice(0, count);

/** Обеспечивает каждому старту одинаково близкий лес и золото после расчистки. */
export const placeStartResources = (
  grid: Cell[][],
  starts: StartPosition[],
) => {
  const width = grid[0].length;
  const height = grid.length;
  for (const { base } of starts) {
    const gold =
      grid[base.y === 1 ? 3 : height - 4][base.x === 1 ? 0 : width - 1];
    const forest =
      grid[base.y === 1 ? 0 : height - 1][base.x === 1 ? 3 : width - 4];
    gold.type = 'gold';
    forest.type = 'forest';
    gold.isWalkable = forest.isWalkable = false;
  }
};

/** Проверенная резервная карта после лимита попыток. */
const fallbackMap = (
  width: number,
  height: number,
  starts: StartPosition[],
): Cell[][] => {
  const grid: Cell[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  placeStartResources(grid, starts);
  return grid;
};

/** Подготавливает карту и стартовые объекты, если карта прошла оценку. */
export const initializeGame = (participants = DEFAULT_PARTICIPANTS) => {
  const { gridColumns, gridRows, mapGenerationMode, customSeed } =
    useSettingsStore.getState();
  const { spawnBuilding, buildings } = useBuildingsStore.getState();
  const { spawnUnit } = useUnitsStore.getState();
  if (
    useGameLoopStore.getState().phase !== 'setup' ||
    Object.keys(buildings).length
  )
    return false;

  useJournalStore.getState().newGame();
  const fail = (startError: string, rejection = reject('map', startError)) => {
    useMapStore.getState().resetStore();
    useGameLoopStore.setState({ phase: 'setup', currentTurn: 0, startError });
    useJournalStore
      .getState()
      .reportError({ type: 'start', actor: null }, 0, rejection);
  };

  if (
    participants.length < 2 ||
    participants.length > MAX_PARTICIPANTS ||
    new Set(participants.map(({ id }) => id)).size !== participants.length
  ) {
    fail('Для партии нужны от двух до четырёх разных участников.');
    return false;
  }
  const minSide =
    participants.length === 2 ? MIN_MAP_SIDE.duel : MIN_MAP_SIDE.group;
  if (
    !Number.isInteger(gridColumns) ||
    !Number.isInteger(gridRows) ||
    gridColumns < minSide ||
    gridRows < minSide
  ) {
    fail(
      `Для ${participants.length} участников нужна карта не меньше ${minSide} × ${minSide} клеток.`,
    );
    return false;
  }
  if (mapGenerationMode === 'fixed' && !isValidSeed(customSeed)) {
    fail('Укажите сид — целое неотрицательное число.');
    return false;
  }

  const starts = getStartPositions(gridColumns, gridRows, participants.length);
  const initialSeed = mapGenerationMode === 'fixed' ? customSeed : randomSeed();
  const spawnStarts = () => {
    for (const [index, { base, worker }] of starts.entries()) {
      spawnBuilding('base', base.x, base.y, participants[index].id);
      spawnUnit(
        'worker',
        worker.x,
        worker.y,
        participants[index].id,
        index === 0,
      );
    }
  };

  try {
    for (let attempt = 0; attempt < MAP_ATTEMPTS; attempt++) {
      const seed =
        initialSeed > Number.MAX_SAFE_INTEGER - attempt
          ? attempt - (Number.MAX_SAFE_INTEGER - initialSeed) - 1
          : initialSeed + attempt;
      const grid = generateMap(gridColumns, gridRows, seed);
      for (const { base } of starts) prepareStartArea(grid, base.x, base.y);
      placeStartResources(grid, starts);
      if (!evaluateMap(grid, starts).ok) continue;
      useMapStore.getState().setGrid(grid, initialSeed);
      spawnStarts();
      return true;
    }

    const grid = fallbackMap(gridColumns, gridRows, starts);
    if (evaluateMap(grid, starts).ok) {
      useMapStore.getState().setGrid(grid, initialSeed, true);
      spawnStarts();
      return true;
    }
  } catch (error) {
    useBuildingsStore.getState().resetStore();
    useUnitsStore.getState().resetStore();
    const detail = error instanceof Error ? error.message : String(error);
    fail(REJECTION_MESSAGE.failure, failure(detail));
    return false;
  }

  fail(
    'Не найдена карта с проходом между базами и доступом к лесу и золоту. Измените сид или повторите случайную генерацию.',
  );
  return false;
};
