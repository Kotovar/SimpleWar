import { writeFileSync } from 'node:fs';
import { expect, it } from 'vite-plus/test';
import {
  MAP_ATTEMPTS,
  MAP_GENERATOR_VERSION,
  MAP_PRESETS,
  type Participant,
} from '../src/shared/config';
import {
  generateMap,
  prepareStartArea,
  useMapStore,
} from '../src/entities/maps';
import { useSettingsStore } from '../src/entities/settings';
import { resetGame } from '../src/features/game-loop';
import {
  initializeGame,
  getStartPositions,
  placeStartResources,
} from '../src/widgets/start-game/lib/initializeGame';
import { evaluateMap } from '../src/widgets/start-game/lib/evaluateMap';
import { findCheapestPaths, getMoveCost } from '../src/shared/lib';

const participants: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
  { id: 'p3', controller: 'ai' },
  { id: 'p4', controller: 'ai' },
];

const terrainComponents = (grid: ReturnType<typeof generateMap>) => {
  const width = grid[0].length;
  const costs = grid.map(row => row.map(getMoveCost));
  const seen = new Set<number>();
  const sizes: number[] = [];
  for (const row of grid)
    for (const cell of row) {
      const key = cell.y * width + cell.x;
      if (!cell.isWalkable || seen.has(key)) continue;
      const component = findCheapestPaths(costs, cell).cost;
      for (const index of component.keys()) seen.add(index);
      sizes.push(component.size);
    }
  return {
    count: sizes.length,
    largestShare: seen.size ? Math.max(...sizes) / seen.size : null,
  };
};

const range = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    median: sorted[Math.floor(sorted.length / 2)],
    max: sorted.at(-1),
  };
};

it('accepts 100 fixed seeds for each preset and both supported party sizes', () => {
  const rows: Array<{
    preset: string;
    participants: number;
    usedFallback: boolean;
    walkable: number;
    components: number;
    largestComponentShare: number | null;
    gold: number;
    forest: number;
    hill: number;
    swamp: number;
    [key: string]: unknown;
  }> = [];
  for (const [preset, { cols, rows: height }] of Object.entries(MAP_PRESETS)) {
    for (const count of [2, 4]) {
      for (let seed = 0; seed < 100; seed++) {
        const starts = getStartPositions(cols, height, count);
        let candidateReason: string | null = null;
        let sourceSeed: number | null = null;
        let expectedGrid: ReturnType<typeof generateMap> | null = null;
        for (let attempt = 0; attempt < MAP_ATTEMPTS; attempt++) {
          const attemptSeed = seed + attempt;
          const candidate = generateMap(cols, height, attemptSeed);
          for (const { base } of starts) {
            prepareStartArea(candidate, base.x, base.y);
          }
          placeStartResources(candidate, starts);
          const result = evaluateMap(candidate, starts);
          if (attempt === 0) candidateReason = result.ok ? null : result.reason;
          if (!result.ok) continue;
          sourceSeed = attemptSeed;
          expectedGrid = candidate;
          break;
        }
        resetGame();
        useSettingsStore.setState({
          mapGenerationMode: 'fixed',
          customSeed: seed,
          gridColumns: cols,
          gridRows: height,
        });
        const accepted = initializeGame(participants.slice(0, count));
        const {
          grid,
          seed: acceptedSeed,
          usedFallback,
        } = useMapStore.getState();
        const assessment = accepted
          ? evaluateMap(grid, getStartPositions(cols, height, count))
          : null;
        const cells = grid.flat();
        const components = terrainComponents(grid);
        rows.push({
          preset,
          width: cols,
          height,
          participants: count,
          seed,
          accepted,
          acceptedSeed,
          sourceSeed,
          usedFallback,
          candidateReason,
          reason: assessment && !assessment.ok ? assessment.reason : null,
          walkable: cells.filter(cell => cell.isWalkable).length,
          components: components.count,
          largestComponentShare: components.largestShare,
          gold: cells.filter(cell => cell.type === 'gold').length,
          forest: cells.filter(cell => cell.type === 'forest').length,
          hill: cells.filter(cell => cell.type === 'hill').length,
          swamp: cells.filter(cell => cell.type === 'swamp').length,
        });
        expect(accepted, `${preset}/${count}/${seed}`).toBe(true);
        expect(assessment, `${preset}/${count}/${seed}`).toEqual({ ok: true });
        expect(acceptedSeed).toBe(seed);
        expect(usedFallback).toBe(sourceSeed === null);
        if (expectedGrid) expect(grid).toEqual(expectedGrid);
      }
    }
  }
  const summary = Object.entries(MAP_PRESETS).flatMap(([preset]) =>
    [2, 4].map(count => {
      const group = rows.filter(
        row => row.preset === preset && row.participants === count,
      );
      return {
        preset,
        participants: count,
        accepted: group.length,
        fallback: group.filter(row => row.usedFallback).length,
        walkable: range(group.map(row => row.walkable)),
        components: range(group.map(row => row.components)),
        largestComponentShare: range(
          group.map(row => row.largestComponentShare ?? 0),
        ),
        gold: range(group.map(row => row.gold)),
        forest: range(group.map(row => row.forest)),
      };
    }),
  );
  writeFileSync(
    '/tmp/simplewar-s04-map-smoke.json',
    JSON.stringify(
      {
        generatorVersion: MAP_GENERATOR_VERSION,
        fixedSeeds: '0..99',
        connectivity: 'four directions, terrain only; bases and units excluded',
        summary,
        rows,
      },
      null,
      2,
    ),
  );
  expect(rows).toHaveLength(800);
});
