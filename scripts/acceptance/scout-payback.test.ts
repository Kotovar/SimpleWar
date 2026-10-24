import { writeFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it, vi } from 'vite-plus/test';
import { UNITS_CONFIG, type Participant } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '@app/game/ai/aiTurn';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, resetGame } from '@features/game-loop';
import { spawn } from '@features/spawn';
import { initVisibilitySystem } from '@features/visibility';
import { initializeGame } from '@widgets/start-game';
import { trackSites } from './siteMetrics';

const results: object[] = [];
const participants: Participant[] = [
  { id: 'p1', controller: 'ai' },
  { id: 'p2', controller: 'ai' },
];
beforeAll(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});
afterAll(() => {
  writeFileSync(
    '/tmp/sw-s9-payback.json',
    JSON.stringify(
      { size: 30, rounds: 20, scoutCost: UNITS_CONFIG.scout.cost, results },
      null,
      2,
    ),
  );
  resetGame();
  vi.restoreAllMocks();
});

it.each(Array.from({ length: 20 }, (_, i) => i))(
  'ранний разведчик, сид %i',
  async seed => {
    resetGame();
    let serial = 0;
    const ids = vi
      .spyOn(crypto, 'randomUUID')
      .mockImplementation(
        () =>
          `00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, '0')}`,
      );
    useSettingsStore.setState({
      gridColumns: 30,
      gridRows: 30,
      mapGenerationMode: 'fixed',
      customSeed: seed,
    });
    expect(initializeGame(participants, { withSites: true })).toBe(true);
    useGameLoopStore.getState().startGame(participants);
    const sites = trackSites();
    try {
      const base = Object.values(useBuildingsStore.getState().buildings).find(
        b => b.owner === 'p1',
      )!;
      // Единственное заданное действие: купить разведчика штатной командой в первом круге.
      expect(
        spawn({
          actor: 'p1',
          buildingId: base.id,
          unitType: 'scout',
          x: 2,
          y: 2,
        }).ok,
      ).toBe(true);
      const scout = Object.values(useUnitsStore.getState().units).find(
        u => u.owner === 'p1' && u.type === 'scout',
      )!;
      let turns = 0;
      while (
        useGameLoopStore.getState().phase === 'inProgress' &&
        useGameLoopStore.getState().currentTurn <= 20
      ) {
        const result = await runAITurn(
          useGameLoopStore.getState().activePlayer,
          { yieldControl: () => Promise.resolve() },
        );
        expect(result?.stalled).toBe(false);
        expect([
          'сбой планировщика',
          'предел команд за ход',
          'повторные отказы команд',
        ]).not.toContain(result!.reason);
        turns++;
      }
      const claims = sites.data.claims.filter(c => c.unitId === scout.id);
      let gold = 0,
        wood = 0,
        repaidTurn: number | null = null;
      for (const claim of claims) {
        gold += claim.gold;
        wood += claim.wood;
        if (repaidTurn === null && gold >= 50 && wood >= 20)
          repaidTurn = claim.turn;
      }
      results.push({
        seed,
        turns,
        completedRounds: Math.floor(turns / 2),
        claims,
        gold,
        wood,
        repaidTurn,
        alive: !!useUnitsStore.getState().units[scout.id],
      });
    } finally {
      sites.off();
      ids.mockRestore();
    }
  },
  120_000,
);
