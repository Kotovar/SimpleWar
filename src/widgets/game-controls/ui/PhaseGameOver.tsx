import { useGameLoopSelectors } from '@features/game-loop';
import styles from './styles.module.css';

export const PhaseGameOver = () => {
  const { activePlayer, currentTurn, startGame } = useGameLoopSelectors();

  return (
    <section className={styles.Section}>
      <div className={styles.GameOverTitle}>
        {activePlayer === 'player' ? 'Победа!' : 'Поражение...'}
      </div>
      <div>Игра завершена за {currentTurn} ходов</div>

      <button className={styles.PrimaryButton} onClick={startGame}>
        Начать новую игру
      </button>
    </section>
  );
};
