import { beforeEach, expect, it } from 'vite-plus/test';
import {
  DEFAULT_SANDBOX,
  SANDBOX_NEW_SIDE,
  type SandboxScenario,
} from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { resetGame } from '@features/game-loop';
import { initializeSandbox } from './initializeSandbox';

beforeEach(() => {
  resetGame();
  useSettingsStore.setState({ gridColumns: 15, gridRows: 15 });
});

it('профиль стороны ИИ попадает в участника, запасы — из сценария', () => {
  const [first, second] = DEFAULT_SANDBOX.sides;
  const scenario: SandboxScenario = {
    emptyField: true,
    sides: [
      { ...first, profile: 'aggressive' },
      // У пассивной стороны профиль игнорируется.
      { ...second, controller: 'passive', profile: 'defensive' },
    ],
  };

  expect(initializeSandbox(scenario)?.participants).toEqual([
    {
      id: 'p1',
      controller: 'ai',
      ai: { profile: 'aggressive', difficulty: 'normal' },
    },
    { id: 'p2', controller: 'passive' },
  ]);
});

it('бой на четверых: каждая сторона у своего угла со своим составом', () => {
  useSettingsStore.setState({ gridColumns: 30, gridRows: 30 });
  const scenario: SandboxScenario = {
    emptyField: true,
    sides: [...DEFAULT_SANDBOX.sides, SANDBOX_NEW_SIDE, SANDBOX_NEW_SIDE],
  };

  const started = initializeSandbox(scenario);
  expect(started?.participants.map(({ id }) => id)).toEqual([
    'p1',
    'p2',
    'p3',
    'p4',
  ]);
  const army = (owner: string) =>
    Object.values(useUnitsStore.getState().units).filter(
      unit => unit.owner === owner && unit.type !== 'worker',
    ).length;
  expect([army('p1'), army('p2'), army('p3'), army('p4')]).toEqual([
    6, 5, 3, 3,
  ]);
  // ИИ рассажены по углам случайно: силы — у своей ратуши, а не у угла слота.
  const all = [
    ...Object.values(useUnitsStore.getState().units),
    ...Object.values(useBuildingsStore.getState().buildings),
  ];
  const bases = all.filter(({ type }) => type === 'base');
  const nearestBase = ({ x, y }: { x: number; y: number }) =>
    [...bases].sort(
      (a, b) =>
        Math.abs(a.x - x) +
        Math.abs(a.y - y) -
        Math.abs(b.x - x) -
        Math.abs(b.y - y),
    )[0].owner;
  expect(all.filter(entity => nearestBase(entity) !== entity.owner)).toEqual(
    [],
  );
});

it('три стороны на малой карте — отказ с понятной причиной', () => {
  const scenario: SandboxScenario = {
    ...DEFAULT_SANDBOX,
    sides: [...DEFAULT_SANDBOX.sides, SANDBOX_NEW_SIDE],
  };

  expect(initializeSandbox(scenario)).toBeNull();
  expect(useGameLoopStore.getState().startError).toMatch(/30 × 30/);
});
