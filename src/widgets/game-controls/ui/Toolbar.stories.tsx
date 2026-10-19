import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { createBuilding, useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import type { Building, Participant } from '@shared/config';
import { AiTurnBanner, ResourcesInfo, TurnControls, TurnInfo } from './info';
import styles from './styles.module.css';

type Props = { onNextTurn: () => void; onReset: () => void };

/** Верхняя панель в том же составе, что и в `PhaseInProgress`. */
const Toolbar = ({ onNextTurn, onReset }: Props) => (
  <header className={styles.Toolbar}>
    <TurnInfo />
    <ResourcesInfo />
    <TurnControls onNextTurn={onNextTurn} onReset={onReset} />
  </header>
);

/** Четыре стороны: человек и три ИИ с разными палитрами. */
const FOUR: Participant[] = [
  { id: 'p1', controller: 'human', palette: 'blue' },
  { id: 'p2', controller: 'ai', palette: 'red' },
  { id: 'p3', controller: 'ai', palette: 'yellow' },
  { id: 'p4', controller: 'ai', palette: 'green' },
];

const setEconomy = (gold: number, wood: number, occupied: number, max = 10) =>
  useEconomyStore.setState(state => ({
    resources: { ...state.resources, player: { gold, wood } },
    populationCap: { ...state.populationCap, player: { occupied, max } },
  }));

// Доход в панели считается по добывающим зданиям игрока.
const setIncomeBuildings = () =>
  useBuildingsStore.setState({
    buildings: Object.fromEntries(
      (['mine', 'sawmill', 'sawmill'] as const)
        .map(type => createBuilding(type, 0, 0, 'p1') as Building)
        .map(building => [building.id, building]),
    ),
  });

const meta = {
  title: 'Interface/Toolbar',
  component: Toolbar,
  args: { onNextTurn: fn(), onReset: fn() },
  beforeEach: () => {
    useGameLoopStore.setState({
      phase: 'inProgress',
      currentTurn: 12,
      activePlayer: 'p1',
    });
    setEconomy(340, 85, 4);
    setIncomeBuildings();
  },
} satisfies Meta<typeof Toolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PlayerTurn: Story = {};

/** Во время хода ИИ кнопка завершения хода недоступна. */
export const AiTurn: Story = {
  beforeEach: () => useGameLoopStore.setState({ activePlayer: 'p2' }),
};

export const FirstTurn: Story = {
  beforeEach: () => {
    useGameLoopStore.setState({ currentTurn: 1 });
    useBuildingsStore.setState({ buildings: {} });
    setEconomy(200, 120, 0, 0);
  },
};

export const PopulationFull: Story = {
  beforeEach: () => setEconomy(340, 85, 10),
};

/** Партия на четверых: очередь ходов в шапке, Красные выбыли. */
export const FourSides: Story = {
  beforeEach: () =>
    useGameLoopStore.setState({
      participants: FOUR,
      eliminated: ['p2'],
      activePlayer: 'p3',
    }),
};

/**
 * Индикатор хода врагов держится всю их очередь: кнопка передаёт ход
 * следующей стороне — от ИИ к ИИ меняется только сторона, время общее;
 * на своём ходу индикатор гаснет и проходит лента «Ваш ход».
 */
export const OpponentTurnBanner: Story = {
  render: args => {
    const passTurn = () => {
      const { activePlayer } = useGameLoopStore.getState();
      const index = FOUR.findIndex(({ id }) => id === activePlayer);
      useGameLoopStore.setState({
        activePlayer: FOUR[(index + 1) % FOUR.length].id,
      });
    };

    return (
      <div style={{ position: 'relative', minHeight: 240 }}>
        <Toolbar {...args} />
        <AiTurnBanner />
        <button style={{ marginTop: 16 }} onClick={passTurn}>
          Передать ход следующей стороне
        </button>
      </div>
    );
  },
  beforeEach: () =>
    useGameLoopStore.setState({
      participants: FOUR,
      eliminated: [],
      activePlayer: 'p2',
    }),
};
