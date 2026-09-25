import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useGameLoopStore } from './gameLoopStore';

describe('useGameLoopStore', () => {
  beforeEach(() => useGameLoopStore.getState().resetGame());

  it('начинает игру с первого хода игрока и очищает ошибку старта', () => {
    useGameLoopStore.setState({
      startError: 'Ошибка',
      currentTurn: 8,
      activePlayer: 'ai',
    });

    useGameLoopStore.getState().startGame();

    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'inProgress',
      currentTurn: 1,
      activePlayer: 'player',
      startError: null,
    });
  });

  it('переключает игроков и увеличивает номер хода после хода ИИ', () => {
    const store = useGameLoopStore.getState();
    store.startGame();
    store.endTurn();

    expect(useGameLoopStore.getState()).toMatchObject({
      currentTurn: 1,
      activePlayer: 'ai',
    });

    useGameLoopStore.getState().endTurn();
    expect(useGameLoopStore.getState()).toMatchObject({
      currentTurn: 2,
      activePlayer: 'player',
    });
  });

  it('не меняет ход вне активной игры и сбрасывает завершённую игру', () => {
    useGameLoopStore.getState().endTurn();
    expect(useGameLoopStore.getState().currentTurn).toBe(0);

    useGameLoopStore.getState().startGame();
    useGameLoopStore.getState().declareWinner('ai');
    useGameLoopStore.getState().endTurn();
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'gameOver',
      winner: 'ai',
      currentTurn: 1,
    });

    useGameLoopStore.getState().resetGame();
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'setup',
      winner: null,
      currentTurn: 0,
      activePlayer: 'player',
      startError: null,
    });
  });
});
