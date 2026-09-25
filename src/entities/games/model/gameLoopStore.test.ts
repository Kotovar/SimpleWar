import { beforeEach, describe, expect, it } from 'vite-plus/test';
import type { Participant } from '@shared/config';
import { useGameLoopStore } from './gameLoopStore';

const THREE: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
  { id: 'p3', controller: 'ai' },
];

const state = () => useGameLoopStore.getState();

describe('useGameLoopStore', () => {
  beforeEach(() => state().resetGame());

  it('начинает игру с первого участника и очищает ошибку старта', () => {
    useGameLoopStore.setState({
      startError: 'Ошибка',
      currentTurn: 8,
      activePlayer: 'p2',
    });

    state().startGame();

    expect(state()).toMatchObject({
      phase: 'inProgress',
      currentTurn: 1,
      activePlayer: 'p1',
      eliminated: [],
      startError: null,
    });
  });

  it('переключает двух участников и увеличивает номер хода после круга', () => {
    state().startGame();
    state().endTurn();
    expect(state()).toMatchObject({ currentTurn: 1, activePlayer: 'p2' });

    state().endTurn();
    expect(state()).toMatchObject({ currentTurn: 2, activePlayer: 'p1' });
  });

  it('обходит трёх участников и завершает круг после последнего', () => {
    state().startGame(THREE);
    const order = [];
    for (let i = 0; i < 4; i++) {
      order.push([state().activePlayer, state().currentTurn]);
      state().endTurn();
    }

    expect(order).toEqual([
      ['p1', 1],
      ['p2', 1],
      ['p3', 1],
      ['p1', 2],
    ]);
  });

  it('пропускает выбывшего и не завершает партию, пока живы двое', () => {
    state().startGame(THREE);
    state().eliminate('p2');

    expect(state()).toMatchObject({ phase: 'inProgress', eliminated: ['p2'] });

    state().endTurn();
    expect(state().activePlayer).toBe('p3');
    state().endTurn();
    expect(state()).toMatchObject({ activePlayer: 'p1', currentTurn: 2 });
  });

  it('засчитывает круг, если выбыл последний в очереди', () => {
    state().startGame(THREE);
    state().eliminate('p3');
    state().endTurn();
    state().endTurn();

    expect(state()).toMatchObject({ activePlayer: 'p1', currentTurn: 2 });
  });

  it('передаёт ход, если выбыл активный участник', () => {
    state().startGame(THREE);
    state().endTurn();
    state().eliminate('p2');

    expect(state()).toMatchObject({ activePlayer: 'p3', phase: 'inProgress' });
  });

  it('объявляет победителем единственного оставшегося', () => {
    state().startGame(THREE);
    state().eliminate('p2');
    state().eliminate('p3');

    expect(state()).toMatchObject({ phase: 'gameOver', winner: 'p1' });
  });

  it('при выбывании человека завершает партию без победителя среди ИИ', () => {
    state().startGame(THREE);
    state().eliminate('p1');

    expect(state()).toMatchObject({
      phase: 'gameOver',
      winner: null,
      eliminated: ['p1'],
    });
  });

  it('в партии только из ИИ продолжает игру, пока их больше одного', () => {
    state().startGame(THREE.map(p => ({ ...p, controller: 'ai' as const })));
    state().eliminate('p1');

    expect(state().phase).toBe('inProgress');
  });

  it('объявляет ничью, если последние выбыли одним действием', () => {
    state().startGame(THREE);
    state().eliminate('p3');
    state().eliminate('p1', 'p2');

    expect(state()).toMatchObject({
      phase: 'gameOver',
      winner: null,
      eliminated: ['p3', 'p1', 'p2'],
    });
  });

  it('не меняет исход после завершения партии', () => {
    state().startGame();
    state().eliminate('p2');
    state().eliminate('p1');

    expect(state()).toMatchObject({ winner: 'p1', eliminated: ['p2'] });
  });

  it('игнорирует повторное выбывание и неизвестного участника', () => {
    state().startGame(THREE);
    state().eliminate('p2');
    state().eliminate('p2');
    state().eliminate('p4');

    expect(state()).toMatchObject({ eliminated: ['p2'], phase: 'inProgress' });
  });

  it('не меняет ход вне активной игры и сбрасывает завершённую игру', () => {
    state().endTurn();
    expect(state().currentTurn).toBe(0);

    state().startGame();
    state().eliminate('p2');
    state().endTurn();
    expect(state()).toMatchObject({
      phase: 'gameOver',
      winner: 'p1',
      currentTurn: 1,
    });

    state().resetGame();
    expect(state()).toMatchObject({
      phase: 'setup',
      winner: null,
      eliminated: [],
      currentTurn: 0,
      activePlayer: 'p1',
      startError: null,
    });
  });
});
