import { useGameLoopSelectors } from '@features/game-loop';
import styles from './TurnInfo.styles.module.css';

export const TurnInfo = () => {
  const { activePlayer, humanId, currentTurn } = useGameLoopSelectors();
  const isOwnTurn = activePlayer === humanId;

  return (
    <div className={styles.TurnInfo}>
      <div className={styles.Turn}>
        <span className={styles.Caption}>Ход</span>
        <strong className={styles.Number}>{currentTurn}</strong>
      </div>
      <span
        className={styles.Side}
        data-relation={isOwnTurn ? 'own' : 'hostile'}
      >
        {isOwnTurn ? 'Ваш ход' : 'Ходит противник'}
      </span>
    </div>
  );
};
