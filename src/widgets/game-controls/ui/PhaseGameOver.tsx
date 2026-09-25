import { useGameLoopSelectors, resetGame } from '@features/game-loop';
import { useSelectionSelectors } from '@features/selection';
import { useHighlightStore, useMovementSelectors } from '@features/pathfinding';
import styles from './styles.module.css';

export const PhaseGameOver = () => {
  const { winner, currentTurn } = useGameLoopSelectors();
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
      <div className={styles.GameOverTitle} data-winner={winner}>
        {winner === 'player' ? 'Победа!' : 'Поражение'}
      </div>
      <div className={styles.GameOverText}>
        Игра завершена за {currentTurn} ходов
      </div>

      <button className={styles.PrimaryButton} onClick={onResetGame}>
        Начать новую игру
      </button>
    </section>
  );
};
