import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { BUILDINGS_CONFIG, type Phase, type Player } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useEconomyStore } from '@entities/economies';
import { calculateMaxPopulation } from '../lib';
import { useBuildingsStore } from '@entities/buildings';

interface GameLoopStoreState {
  currentTurn: number;
  activePlayer: Player;
  phase: Phase;
  winner: Player | null;

  startGame: () => void;
  setPhase: (phase: Phase) => void;
  endTurn: () => void;
  resetGame: () => void;
  declareWinner: (winner: Player) => void;
}

export const useGameLoopStore = create<GameLoopStoreState>()(
  immer(set => ({
    currentTurn: 0,
    activePlayer: 'player',
    phase: 'setup',
    winner: null,

    startGame: () =>
      set(state => {
        state.phase = 'inProgress';
        state.currentTurn = 1;
        state.activePlayer = 'player';
      }),

    setPhase: (phase: Phase) =>
      set(state => {
        state.phase = phase;

        if (phase === 'inProgress') {
          state.currentTurn = 1;
          state.activePlayer = 'player';
        }
      }),

    endTurn: () =>
      set(state => {
        if (state.phase !== 'inProgress') return;

        if (state.activePlayer === 'ai') {
          state.currentTurn++;
        }

        state.activePlayer = state.activePlayer === 'player' ? 'ai' : 'player';
      }),

    declareWinner: winner =>
      set(state => {
        state.phase = 'gameOver';
        state.winner = winner;
      }),

    resetGame: () => {
      set(state => {
        state.phase = 'setup';
        state.currentTurn = 0;
        state.activePlayer = 'player';
        state.winner = null;
      });
    },
  })),
);

let initialized = false;

export const initGameLoopEvents = () => {
  if (initialized) return;
  initialized = true;

  gameEvents.subscribe(event => {
    if (event.type === 'BASE_DESTROYED') {
      const winner = event.owner === 'player' ? 'ai' : 'player';
      useGameLoopStore.getState().declareWinner(winner);
    }

    if (event.type === 'BUILDING_DESTROYED') {
      const { setPopulationSupply } = useEconomyStore.getState();
      const { getLimitBuildings } = useBuildingsStore.getState();
      const config = BUILDINGS_CONFIG[event.building.type];
      const supply = config?.populationSupply ?? 0;
      const eventBuilding = event.building;

      if (supply > 0) {
        // TODO: Перепроверить - хочется избавиться от фильтрации
        // Так же добавить метод для просчитывания макс лимита при старте игры, чтобы не задавать в константе
        const buildings = getLimitBuildings(event.owner);
        const currentBuildings = buildings.filter(
          building => building.id !== eventBuilding.id,
        );
        const updatedSupply = calculateMaxPopulation(currentBuildings);
        setPopulationSupply(event.owner, updatedSupply);
      }
    }
  });
};
