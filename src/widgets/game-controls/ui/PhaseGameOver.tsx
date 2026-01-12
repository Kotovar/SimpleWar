import { useGameLoopSelectors, resetGame } from '@features/game-loop';
import { useSelectionSelectors } from '@features/selection';
import { useHighlightStore, useMovementSelectors } from '@features/pathfinding';
import styles from './styles.module.css';

export const PhaseGameOver = () => {
  const { activePlayer, currentTurn } = useGameLoopSelectors();
  const { clearSelection } = useSelectionSelectors();
  const { resetStore: clearMovement } = useMovementSelectors();
  const { resetStore: clearHighlight } = useHighlightStore();

  const onResetGame = () => {
    clearSelection();
    clearMovement();
    clearHighlight();
    resetGame();
  };

  return (
    <section className={styles.Section}>
      <div className={styles.GameOverTitle}>
        {activePlayer === 'player' ? 'Победа!' : 'Поражение...'}
      </div>
      <div>Игра завершена за {currentTurn} ходов</div>

      <button className={styles.PrimaryButton} onClick={onResetGame}>
        Начать новую игру
      </button>
    </section>
  );
};
