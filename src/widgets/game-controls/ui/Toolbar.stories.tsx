import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { createBuilding, useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import type { Building } from '@shared/config';
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
        .map(type => createBuilding(type, 0, 0, 'player') as Building)
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
      activePlayer: 'player',
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
  beforeEach: () => useGameLoopStore.setState({ activePlayer: 'ai' }),
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

/**
 * Баннер запускается при переходе хода к ИИ, поэтому история
 * передаёт ход сама. Кнопка повторяет показ.
 */
export const OpponentTurnBanner: Story = {
  render: args => {
    const passTurn = () => {
      useGameLoopStore.setState({ activePlayer: 'player' });
      useGameLoopStore.setState({ activePlayer: 'ai' });
    };

    return (
      <div style={{ position: 'relative', minHeight: 240 }}>
        <Toolbar {...args} />
        <AiTurnBanner />
        <button style={{ marginTop: 16 }} onClick={passTurn}>
          Передать ход противнику
        </button>
      </div>
    );
  },
  play: () => {
    useGameLoopStore.setState({ activePlayer: 'ai' });
  },
};
