import { writeFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import {
  SITE_TYPES,
  START_FAIRNESS_TOLERANCE,
  type SiteType,
} from '@shared/config';
import { findCheapestPaths, getMoveCost } from '@shared/lib';
import * as maps from '@entities/maps';
import { useSitesStore } from '@entities/sites';
import { useSettingsStore } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import { resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initializeStandardGame } from '@widgets/start-game';
import { initPopulationSystem } from '@app/system';
import { evaluateMap } from '../../src/widgets/start-game/lib/evaluateMap';
import { getStartPositions } from '../../src/widgets/start-game/lib/initializeGame';

afterEach(() => {
  vi.restoreAllMocks();
  resetGame();
});

it('P08 S1: сидами 0–19 проверяет находки обычных партий на 2–4 стороны', () => {
  initPopulationSystem();
  initVisibilitySystem();
  const generated = vi.spyOn(maps, 'generateMap');
  const rows: object[] = [];
  let fallbacks = 0;
  let rejectedCandidates = 0;
  let maximumSpread = 0;
  for (const count of [2, 3, 4])
    for (let seed = 0; seed < 20; seed++) {
      resetGame();
      generated.mockClear();
      const settings = useSettingsStore.getState();
      settings.setAiCount(count - 1);
      settings.setGridSize(30, 30);
      settings.setMapGenerationMode('fixed');
      settings.setCustomSeed(seed);
      const participants = initializeStandardGame();
      expect(participants).not.toBeNull();
      useGameLoopStore.getState().startGame(participants!);
      const map = maps.useMapStore.getState();
      const sites = Object.values(useSitesStore.getState().sites);
      const starts = getStartPositions(30, 30, count);
      expect(evaluateMap(map.grid, starts, sites)).toEqual({ ok: true });
      const movement = map.grid.map(row => row.map(getMoveCost));
      for (const { base } of starts) movement[base.y][base.x] = 0;
      const nearest = starts.map(({ worker }) => {
        const { cost } = findCheapestPaths(movement, worker);
        expect(sites.every(s => cost.has(s.y * 30 + s.x))).toBe(true);
        return Object.fromEntries(
          SITE_TYPES.map(type => [
            type,
            Math.min(
              ...sites
                .filter(s => s.type === type)
                .map(s => cost.get(s.y * 30 + s.x)!),
            ),
          ]),
        ) as Record<SiteType, number>;
      });
      const spread = Math.max(
        ...SITE_TYPES.map(
          type =>
            Math.max(...nearest.map(n => n[type])) -
            Math.min(...nearest.map(n => n[type])),
        ),
      );
      expect(spread).toBeLessThanOrEqual(START_FAIRNESS_TOLERANCE);
      maximumSpread = Math.max(maximumSpread, spread);
      const attempts = generated.mock.calls.map(call => call[2]);
      const rejected = attempts.length - Number(!map.usedFallback);
      rejectedCandidates += rejected;
      fallbacks += Number(map.usedFallback);
      rows.push({
        count,
        requestedSeed: seed,
        acceptedSeed: map.usedFallback ? null : attempts.at(-1),
        attempts,
        rejected,
        fallback: map.usedFallback,
        sites: sites.length,
        counts: Object.fromEntries(
          SITE_TYPES.map(type => [
            type,
            sites.filter(s => s.type === type).length,
          ]),
        ),
        nearest,
        spread,
      });
    }
  writeFileSync(
    '/tmp/simplewar-p08-sites-0-19.json',
    JSON.stringify(
      {
        size: '30x30',
        cases: rows.length,
        fallbacks,
        rejectedCandidates,
        maximumSpread,
        rows,
      },
      null,
      2,
    ),
  );
  expect(rows).toHaveLength(60);
}, 60000);
