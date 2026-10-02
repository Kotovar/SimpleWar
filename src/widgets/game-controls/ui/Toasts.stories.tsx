import type { Meta, StoryObj } from '@storybook/react-vite';
import { useJournalStore } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { CommandToasts } from './info';

const journal = () => useJournalStore.getState();

const rejectMove = () =>
  journal().reportError({ type: 'move', actor: 'p1' }, 3, {
    ok: false,
    kind: 'rejected',
    code: 'points',
    message: 'Нет очков движения',
  });

const failBuild = () =>
  journal().reportError({ type: 'build', actor: 'p1' }, 3, {
    ok: false,
    kind: 'failure',
    code: 'map',
    message: 'Не удалось выполнить приказ',
    detail: 'TypeError: cell is undefined',
  });

const researchDone = () =>
  journal().record({
    type: 'researchDone',
    actor: 'p1',
    turn: 3,
    visibleTo: ['p1'],
    details: { research: 'formation' },
  });

const enemySpotted = (count: number) =>
  journal().record({
    type: 'enemySpotted',
    actor: null,
    turn: 3,
    visibleTo: ['p1'],
    details: { count, x: 5, y: 4 },
  });

type Props = { events: (() => void)[] };

/**
 * Сообщения живут 3,5 с и гаснут: кнопка повторяет события истории.
 * Сообщения берутся из журнала, как в партии; игрок — `p1`.
 */
const Toasts = ({ events }: Props) => (
  <div style={{ display: 'grid', justifyItems: 'center', gap: 16 }}>
    <button onClick={() => events.forEach(event => event())}>Повторить</button>
    {/* Область карты, как в экране партии: сообщения встают по её центру. */}
    <div
      style={{
        display: 'grid',
        gridTemplateAreas: "'map'",
        width: '100%',
        minHeight: 240,
      }}
    >
      <CommandToasts />
    </div>
  </div>
);

const meta = {
  title: 'Interface/Toasts',
  component: Toasts,
  args: { events: [] },
  argTypes: { events: { control: false } },
  // Запись после монтирования: так же события приходят в партии.
  play: ({ args }) => args.events.forEach(event => event()),
} satisfies Meta<typeof Toasts>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rejection: Story = { args: { events: [rejectMove] } };

/** Повтор того же отказа подряд — счётчик вместо второго сообщения. */
export const RepeatedRejection: Story = {
  args: { events: [rejectMove, rejectMove, rejectMove] },
};

/** Техническая деталь сбоя видна только в режиме отладки. */
export const FailureInDebug: Story = {
  args: { events: [failBuild] },
  beforeEach: () => useDebugStore.setState({ enabled: true }),
};

export const ResearchDone: Story = { args: { events: [researchDone] } };

export const EnemySpotted: Story = {
  args: { events: [() => enemySpotted(1)] },
};

export const EnemySquadSpotted: Story = {
  args: { events: [() => enemySpotted(3)] },
};

/** Отказы и уведомления вперемешку — в порядке событий. */
export const Mixed: Story = {
  args: { events: [researchDone, rejectMove, () => enemySpotted(2)] },
};
