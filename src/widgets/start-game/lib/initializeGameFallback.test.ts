import { expect, it, vi } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { generateMap, useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { resetGame } from '@features/game-loop';
import { initializeGame } from './initializeGame';

vi.mock('@entities/maps', async importOriginal => {
  const actual = await importOriginal<typeof import('@entities/maps')>();
  return {
    ...actual,
    generateMap: vi.fn((width: number, height: number): Cell[][] =>
      Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => ({
          x,
          y,
          type: 'water',
          isWalkable: false,
        })),
      ),
    ),
  };
});

it('uses the validated fallback after ten rejected candidates', () => {
  resetGame();
  useSettingsStore.setState({
    mapGenerationMode: 'fixed',
    customSeed: 12,
    gridColumns: 15,
    gridRows: 15,
  });
  expect(initializeGame()).toBe(true);
  expect(generateMap).toHaveBeenCalledTimes(10);
  expect(useMapStore.getState()).toMatchObject({
    seed: 12,
    usedFallback: true,
  });
  expect(Object.values(useBuildingsStore.getState().buildings)).toHaveLength(2);
  expect(Object.values(useUnitsStore.getState().units)).toHaveLength(2);
});

it('rejects an oversized map before generating it', () => {
  resetGame();
  vi.mocked(generateMap).mockClear();
  useSettingsStore.setState({ gridColumns: 101, gridRows: 60 });

  expect(initializeGame()).toBe(false);
  expect(generateMap).not.toHaveBeenCalled();
  expect(useMapStore.getState().grid).toEqual([]);
});
