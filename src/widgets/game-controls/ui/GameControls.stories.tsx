import type { Meta, StoryObj } from '@storybook/react-vite';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useSettingsStore } from '@entities/settings';
import { GameControls } from './GameControls';

const meta = {
  title: 'Interface/Screens',
  component: GameControls,
  args: { onStartGame: () => useGameLoopStore.getState().startGame() },
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
      winner: 'p1',
      currentTurn: 27,
    }),
};

/** Поражение на четверых: места всех сторон, выбывшие с ходом выбывания. */
export const FourSidesDefeat: Story = {
  beforeEach: () => {
    useGameLoopStore.setState({
      phase: 'gameOver',
      winner: null,
      currentTurn: 41,
      participants: [
        { id: 'p1', controller: 'human', palette: 'blue' },
        { id: 'p2', controller: 'ai', palette: 'red' },
        { id: 'p3', controller: 'ai', palette: 'yellow' },
        { id: 'p4', controller: 'ai', palette: 'green' },
      ],
      eliminated: ['p4', 'p1'],
    });
    const { record } = useJournalStore.getState();
    for (const [participant, turn] of [
      ['p4', 23],
      ['p1', 41],
    ] as const)
      record({
        type: 'eliminated',
        actor: null,
        turn,
        visibleTo: 'all',
        details: { participant },
      });
  },
};

export const Defeat: Story = {
  beforeEach: () =>
    useGameLoopStore.setState({
      phase: 'gameOver',
      winner: 'p2',
      currentTurn: 14,
    }),
};
