import { expect, it, vi } from 'vite-plus/test';
import { PARTICIPANT_IDS, type Cell, type Participant } from '@shared/config';
import { generateMap, useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useSitesStore } from '@entities/sites';
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

it.each([2, 3, 4])(
  'uses a symmetric validated fallback for %s participants after ten rejected candidates',
  count => {
    resetGame();
    vi.mocked(generateMap).mockClear();
    useSettingsStore.setState({
      mapGenerationMode: 'fixed',
      customSeed: 12,
      gridColumns: count === 2 ? 15 : 30,
      gridRows: count === 2 ? 15 : 30,
    });
    const participants = PARTICIPANT_IDS.slice(0, count).map(
      (id): Participant => ({ id, controller: 'ai' }),
    );
    expect(initializeGame(participants, { withSites: true })).toBe(true);
    expect(
      Object.values(useSitesStore.getState().sites).length,
    ).toBeGreaterThan(0);
    expect(generateMap).toHaveBeenCalledTimes(10);
    expect(useMapStore.getState()).toMatchObject({
      seed: 12,
      usedFallback: true,
    });
    expect(Object.values(useBuildingsStore.getState().buildings)).toHaveLength(
      count,
    );
    expect(Object.values(useUnitsStore.getState().units)).toHaveLength(count);
    const types = useMapStore.getState().grid.map(row => row.map(c => c.type));
    if (count > 2) {
      expect(types).toEqual(types.map(row => [...row].reverse()));
      expect(types).toEqual([...types].reverse());
    }
  },
);

it('rejects an oversized map before generating it', () => {
  resetGame();
  vi.mocked(generateMap).mockClear();
  useSettingsStore.setState({ gridColumns: 101, gridRows: 60 });

  expect(initializeGame()).toBe(false);
  expect(generateMap).not.toHaveBeenCalled();
  expect(useMapStore.getState().grid).toEqual([]);
});
