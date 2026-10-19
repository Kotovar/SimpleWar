import { afterEach, expect, it } from 'vite-plus/test';
import { PARTICIPANT_IDS, type Cell, type Participant } from '@shared/config';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useBuildingsStore } from '@entities/buildings';
import { resetGame } from '@features/game-loop';
import { initializeGame, getStartPositions } from './initializeGame';
import { evaluateMap } from './evaluateMap';

const party = (count: number): Participant[] =>
  PARTICIPANT_IDS.slice(0, count).map((id, index) => ({
    id,
    controller: index === 0 ? 'human' : 'ai',
  }));

const start = (count: number, seed: number, emptyField = false) => {
  resetGame();
  useSettingsStore.setState({
    gridColumns: 30,
    gridRows: 30,
    mapGenerationMode: 'fixed',
    customSeed: seed,
  });
  expect(initializeGame(party(count), { emptyField })).toBe(true);
  return useMapStore.getState().grid;
};

const expectSymmetry = (grid: Cell[][]) => {
  const height = grid.length;
  const width = grid[0].length;
  for (const { x, y, type, isWalkable } of grid.flat()) {
    for (const other of [grid[y][width - 1 - x], grid[height - 1 - y][x]]) {
      expect({ type: other.type, isWalkable: other.isWalkable }).toEqual({
        type,
        isWalkable,
      });
    }
  }
};

afterEach(() => resetGame());

it.each([3, 4])(
  'сохраняет обе оси симметрии после подготовки %s стартов на сидах 0–19',
  count => {
    for (let seed = 0; seed < 20; seed++) {
      const grid = start(count, seed);
      expectSymmetry(grid);
      expect(evaluateMap(grid, getStartPositions(30, 30, count))).toEqual({
        ok: true,
      });
    }
  },
);

it.each([3, 4])(
  'пустое поле на %s стороны симметрично вместе со стартовыми ресурсами',
  count => {
    expectSymmetry(start(count, 43, true));
  },
);

it.each([3, 4])(
  'поддерживает минимальную программную карту 9 × 9 на %s стороны',
  count => {
    resetGame();
    useSettingsStore.setState({
      gridColumns: 9,
      gridRows: 9,
      mapGenerationMode: 'fixed',
      customSeed: 43,
    });
    expect(initializeGame(party(count))).toBe(true);
    const grid = useMapStore.getState().grid;
    expectSymmetry(grid);
    expect(evaluateMap(grid, getStartPositions(9, 9, count))).toEqual({
      ok: true,
    });
  },
);

it.each([3, 4])(
  'рассаживает %s стороны по сиду, не меняя угол человека',
  count => {
    const seats = new Set<string>();
    const positions = () =>
      Object.values(useBuildingsStore.getState().buildings)
        .filter(b => b.type === 'base')
        .map(({ owner, x, y }) => ({ owner, x, y }));
    for (let seed = 0; seed < 20; seed++) {
      start(count, seed);
      const first = positions();
      expect(first.find(b => b.owner === 'p1')).toEqual({
        owner: 'p1',
        x: 1,
        y: 1,
      });
      seats.add(JSON.stringify(first));
      start(count, seed);
      expect(positions()).toEqual(first);
    }
    expect(seats.size).toBeGreaterThan(1);
  },
);
