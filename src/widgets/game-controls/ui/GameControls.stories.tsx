import type { Meta, StoryObj } from '@storybook/react-vite';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { GameControls } from './GameControls';

const meta = {
  title: 'Interface/Screens',
  component: GameControls,
  decorators: [
    Story => (
      <main
        style={{
          maxWidth: 640,
          margin: '48px auto',
          padding: 24,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow)',
        }}
      >
        <Story />
      </main>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof GameControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Setup: Story = {};

export const SetupFixedSeed: Story = {
  beforeEach: () =>
    useSettingsStore.setState({
      mapGenerationMode: 'fixed',
      customSeed: 0.4242,
    }),
};

/** Текст из `initializeGame`: по сиду не нашлась играбельная карта. */
export const SetupError: Story = {
  beforeEach: () => {
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 0.1 });
    useGameLoopStore.setState({
      startError:
        'Не найдена карта с проходом между базами и доступом к лесу и золоту. Измените сид или повторите случайную генерацию.',
    });
  },
};

export const Victory: Story = {
  beforeEach: () =>
    useGameLoopStore.setState({
      phase: 'gameOver',
      winner: 'player',
      currentTurn: 27,
    }),
};

export const Defeat: Story = {
  beforeEach: () =>
    useGameLoopStore.setState({
      phase: 'gameOver',
      winner: 'ai',
      currentTurn: 14,
    }),
};
