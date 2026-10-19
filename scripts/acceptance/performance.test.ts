import { writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { afterAll, beforeAll, expect, it } from 'vite-plus/test';
import {
  BUILDINGS_CONFIG,
  type Cell,
  type BuildingType,
  type Participant,
  type ParticipantId,
  type UnitType,
} from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { runAITurn } from '@app/game/ai/aiTurn';
import { captureSnapshot } from '@app/saves/snapshot';
import { createBuilding, useBuildingsStore } from '@entities/buildings';
import { createUnit, useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { initGameLoopEvents, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initializeGame } from '@widgets/start-game';

const results: Array<Record<string, unknown>> = [];
const p95 = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
beforeAll(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
});
afterAll(() => {
  writeFileSync(
    '/tmp/simplewar-s21-performance.json',
    JSON.stringify(
      {
        machine: {
          cpu: cpus()[0]?.model,
          os: `${platform()} ${release()}`,
          node: process.version,
        },
        scope:
          'headless real AI; prepared stress fixtures; UI frames measured separately',
        results,
      },
      null,
      2,
    ),
  );
  resetGame();
});

it.each(
  [2, 3].flatMap(count => ['scouts', 'mixed'].map(army => ({ count, army }))),
)(
  'S21: 100×100, $count участников, $army, 50 зданий у каждого',
  async ({ count, army }) => {
    const composition: UnitType[] =
      army === 'scouts'
        ? Array.from({ length: 30 }, () => 'scout')
        : [
            'worker',
            'worker',
            'worker',
            'worker',
            'worker',
            'worker',
            'swordsman',
            'archer',
            'archer',
            'spearman',
            'spearman',
            'rider',
            'siege',
            'mage',
            'healer',
            'griffon',
            'scout',
          ];
    resetGame();
    useSettingsStore.setState({
      gridColumns: 100,
      gridRows: 100,
      customSeed: 7,
      mapGenerationMode: 'fixed',
    });
    const participants: Participant[] = Array.from(
      { length: count },
      (_, i) => ({ id: `p${i + 1}` as ParticipantId, controller: 'ai' }),
    );
    expect(initializeGame(participants, { emptyField: true })).toBe(true);
    const grid: Cell[][] = useMapStore.getState().grid.map(row =>
      row.map(cell => ({
        ...cell,
        type: 'grass' as const,
        isWalkable: true,
      })),
    );
    // Две узкие щели в центральной перегородке; это фикстура, не тест генератора.
    for (let y = 0; y < 100; y++)
      if (y !== 49 && y !== 50)
        grid[y][50] = { ...grid[y][50], type: 'mountain', isWalkable: false };
    const units: ReturnType<typeof useUnitsStore.getState>['units'] = {};
    const buildings: ReturnType<
      typeof useBuildingsStore.getState
    >['buildings'] = {};
    const kinds = Object.keys(BUILDINGS_CONFIG).filter(
      type => type !== 'base',
    ) as BuildingType[];
    for (const [index, { id }] of participants.entries()) {
      const offset = [
        { x: 2, y: 2 },
        { x: 70, y: 70 },
        { x: 70, y: 2 },
      ][index];
      for (let n = 0; n < 50; n++) {
        const type = n === 0 ? 'base' : kinds[(n - 1) % kinds.length];
        const x = offset.x + (n % 10),
          y = offset.y + Math.floor(n / 10);
        const terrain = BUILDINGS_CONFIG[type].requiredField ?? 'grass';
        grid[y][x] = {
          ...grid[y][x],
          type: terrain,
          isWalkable: terrain === 'grass',
        };
        const building = createBuilding(type, x, y, id)!;
        buildings[building.id] = building;
      }
      for (let n = 0; n < composition.length; n++) {
        const unit = createUnit(
          composition[n],
          offset.x + (n % 10),
          offset.y + 7 + Math.floor(n / 10),
          id,
          true,
        )!;
        if (unit.role === 'military') unit.attackPoints = unit.maxAttackPoints;
        units[unit.id] = unit;
      }
    }
    useMapStore.setState({ grid });
    useBuildingsStore.setState({ buildings });
    useUnitsStore.setState({ units });
    for (const { id } of participants) {
      useEconomyStore.getState().setPopulationSupply(id, 30);
      useEconomyStore.setState({
        populationCap: {
          ...useEconomyStore.getState().populationCap,
          [id]: { max: 30, occupied: 30 },
        },
      });
    }
    useGameLoopStore.getState().startGame(participants);
    expect(Object.keys(units)).toHaveLength(count * composition.length);
    expect(Object.keys(buildings)).toHaveLength(count * 50);
    // Готовый снимок используется и браузерным замером; штатный формат S20.
    const saved = captureSnapshot();
    if (army === 'scouts')
      writeFileSync(
        `/tmp/simplewar-s21-stress-${count}.json`,
        JSON.stringify(saved),
      );
    const totals: number[] = [],
      chunks: number[] = [];
    const reasons: string[] = [];
    for (let turn = 0; turn < 8 * count; turn++) {
      const loop = useGameLoopStore.getState();
      if (loop.phase !== 'inProgress') break;
      const start = performance.now();
      let resumed = start;
      const result = await runAITurn(loop.activePlayer, {
        animate: false,
        yieldControl: async () => {
          chunks.push(performance.now() - resumed);
          await new Promise<void>(resolve => setTimeout(resolve, 0));
          resumed = performance.now();
        },
      });
      chunks.push(performance.now() - resumed);
      totals.push(performance.now() - start);
      reasons.push(result?.reason ?? 'no result');
      expect(result?.stalled).toBe(false);
    }
    const row = {
      participants: count,
      army,
      units: count * composition.length,
      buildings: count * 50,
      populationPerSide: 30,
      turns: totals.length,
      p95TurnMs: p95(totals),
      maxChunkMs: Math.max(...chunks),
      reasons,
    };
    results.push(row);
    console.log(row);
    expect(row.turns).toBe(8 * count);
    expect(reasons).not.toContain('предел команд за ход');
    expect(row.p95TurnMs, 'S21 p95 хода ≤ 2 с').toBeLessThanOrEqual(2000);
    expect(
      row.maxChunkMs,
      'S21 непрерывная порция ≤ 100 мс',
    ).toBeLessThanOrEqual(100);
  },
  300_000,
);
