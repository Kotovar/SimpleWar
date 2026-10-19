import { beforeEach, expect, it } from 'vite-plus/test';
import { DEFAULT_SANDBOX, type SandboxScenario } from '@shared/config';
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
