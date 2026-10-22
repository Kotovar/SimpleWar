import { beforeEach, expect, it } from 'vite-plus/test';
import { DEFAULT_SANDBOX, SITE_TYPES } from '@shared/config';
import { useSitesStore } from '@entities/sites';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { resetGame } from '@features/game-loop';
import { initializeStandardGame } from './initializeStandardGame';
import { initializeSandbox } from './initializeSandbox';
import { getStartPositions } from './initializeGame';
import { evaluateMap } from './evaluateMap';

beforeEach(() => resetGame());

it.each([
  [15, 15, 2],
  [24, 24, 2],
  [30, 30, 3],
  [30, 30, 4],
  [100, 60, 4],
  [100, 100, 4],
])(
  'обычная партия %s × %s на %s стороны получает честные находки и повторяется по сиду',
  (width, height, count) => {
    const start = () => {
      const settings = useSettingsStore.getState();
      settings.setAiCount(count - 1);
      settings.setGridSize(width, height);
      settings.setMapGenerationMode('fixed');
      settings.setCustomSeed(43);
      expect(initializeStandardGame()).toHaveLength(count);
      const sites = Object.values(useSitesStore.getState().sites);
      expect(SITE_TYPES.every(type => sites.some(s => s.type === type))).toBe(
        true,
      );
      expect(
        evaluateMap(
          useMapStore.getState().grid,
          getStartPositions(width, height, count),
          sites,
        ),
      ).toEqual({ ok: true });
      return structuredClone({ sites, grid: useMapStore.getState().grid });
    };
    const first = start();
    resetGame();
    expect(useSitesStore.getState().sites).toEqual({});
    expect(start()).toEqual(first);
  },
);

it.each([false, true])(
  'песочница с emptyField=%s не получает находки',
  emptyField => {
    expect(
      initializeSandbox({ ...DEFAULT_SANDBOX, emptyField }),
    ).not.toBeNull();
    expect(useSitesStore.getState().sites).toEqual({});
  },
);
