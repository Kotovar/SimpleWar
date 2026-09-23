import { useGameLoopSelectors } from '@features/game-loop';
import { OverlayCanvas } from './OverlayCanvas';
import styles from './styles.module.css';

export const FinishGameCanvas = () => {
  const { phase, winner } = useGameLoopSelectors();

  return phase === 'gameOver' ? (
    <OverlayCanvas
      title={winner === 'player' ? 'Победа!' : 'Поражение...'}
      hint='Нажмите "Начать новую игру" для старта новой игры'
      className={styles.FinishCanvas}
    />
  ) : null;
};
