import { useGameLoopSelectors, resetGame } from '@features/game-loop';
import styles from './styles.module.css';

export const PhaseGameOver = () => {
  const { winner, humanId, participants, eliminated, currentTurn } =
    useGameLoopSelectors();
  const isDraw = eliminated.length === participants.length;
  const title =
    winner !== null && winner === humanId
      ? 'Победа!'
      : isDraw
        ? 'Ничья'
        : 'Поражение';

  return (
    <section className={styles.Section}>
      <div className={styles.GameOverTitle} data-defeat={title === 'Поражение'}>
        {title}
      </div>
      <div className={styles.GameOverText}>
        Игра завершена за {currentTurn} ходов
      </div>

      <button className={styles.PrimaryButton} onClick={resetGame}>
        Начать новую игру
      </button>
    </section>
  );
};
