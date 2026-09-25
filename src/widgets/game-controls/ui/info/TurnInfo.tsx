import { useGameLoopSelectors } from '@features/game-loop';
import styles from './TurnInfo.styles.module.css';

export const TurnInfo = () => {
  const { activePlayer, currentTurn } = useGameLoopSelectors();

  return (
    <div className={styles.TurnInfo}>
      <div className={styles.Turn}>
        <span className={styles.Caption}>Ход</span>
        <strong className={styles.Number}>{currentTurn}</strong>
      </div>
      <span className={styles.Side} data-owner={activePlayer}>
        {activePlayer === 'ai' ? 'Ходит противник' : 'Ваш ход'}
      </span>
    </div>
  );
};
