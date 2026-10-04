import type { ReactNode } from 'react';
import { useGameLoopStore } from '@entities/games';
import { useSelectionStore } from '@features/selection';
import { useMovementStore, useHighlightStore } from '@features/pathfinding';
import { useGameLoopSelectors, resetGame } from '@features/game-loop';
import { SandboxReport } from './sandbox';
import { PlayerResult } from './PlayerResult';
import { SelectionCard } from './SelectionCard';
import { MinimapOverlay } from './MinimapOverlay';
import resultStyles from './PhaseGameOver.styles.module.css';
import styles from './styles.module.css';

export const PhaseGameOver = ({
  minimap,
  onOpenSaves,
}: {
  minimap?: ReactNode;
  onOpenSaves?: () => void;
}) => {
  const { winner, humanId, participants, eliminated, currentTurn } =
    useGameLoopSelectors();
  const isDraw = eliminated.length === participants.length;
  const review = useGameLoopStore(state => state.reviewWorld);
  const setReview = (enabled: boolean) => {
    useSelectionStore.getState().clearSelection();
    useMovementStore.getState().resetStore();
    useHighlightStore.getState().resetStore();
    useGameLoopStore.getState().setReviewWorld(enabled);
  };
  // Партия без человека (тестирование ИИ против ИИ) — без «победы/поражения».
  const title =
    humanId === null
      ? 'Партия завершена'
      : winner !== null && winner === humanId
        ? 'Победа!'
        : isDraw
          ? 'Ничья'
          : 'Поражение';

  if (review) {
    return (
      <>
        <header className={`${styles.Toolbar} ${resultStyles.Toolbar}`}>
          <div className={resultStyles.Heading}>
            <h2
              className={styles.GameOverTitle}
              data-defeat={title === 'Поражение'}
            >
              {title}
            </h2>
            <span className={styles.Hint}>
              Ход {currentTurn} · Полный обзор завершённой партии
            </span>
          </div>
          <div className={styles.ButtonGroup}>
            {onOpenSaves && <button onClick={onOpenSaves}>Сохранения</button>}
            <button
              className={styles.ToggleButton}
              onClick={() => setReview(false)}
            >
              Итоги партии
            </button>
            <button className={styles.ToggleButton} onClick={resetGame}>
              Начать новую игру
            </button>
          </div>
        </header>
        <SelectionCard />
        {minimap && <MinimapOverlay>{minimap}</MinimapOverlay>}
      </>
    );
  }

  return (
    <section className={styles.Section}>
      <h2 className={styles.GameOverTitle} data-defeat={title === 'Поражение'}>
        {title}
      </h2>
      <div className={styles.GameOverText}>
        Игра завершена на ходу {currentTurn}
      </div>

      {humanId && <PlayerResult player={humanId} />}
      <SandboxReport />
      {onOpenSaves && (
        <button className={styles.ToggleButton} onClick={onOpenSaves}>
          Сохранения
        </button>
      )}

      <button className={styles.ToggleButton} onClick={() => setReview(true)}>
        Обзор всей карты
      </button>
      <button className={styles.PrimaryButton} onClick={resetGame}>
        Начать новую игру
      </button>
    </section>
  );
};
