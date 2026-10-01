import { pluralRu } from '@shared/lib';
import { useGameLoopSelectors, resetGame } from '@features/game-loop';
import { SandboxReport } from './sandbox';
import styles from './styles.module.css';

export const PhaseGameOver = () => {
  const { winner, humanId, participants, eliminated, currentTurn } =
    useGameLoopSelectors();
  const isDraw = eliminated.length === participants.length;
  // Партия без человека (тестирование ИИ против ИИ) — без «победы/поражения».
  const title =
    humanId === null
      ? 'Партия завершена'
      : winner !== null && winner === humanId
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
        Игра завершена за {currentTurn}{' '}
        {pluralRu(currentTurn, ['ход', 'хода', 'ходов'])}
      </div>

      <SandboxReport />

      <button className={styles.PrimaryButton} onClick={resetGame}>
        Начать новую игру
      </button>
    </section>
  );
};
