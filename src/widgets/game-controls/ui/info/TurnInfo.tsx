import { useGameLoopSelectors } from '@features/game-loop';
import styles from './TurnInfo.styles.module.css';

export const TurnInfo = () => {
  const { activePlayer, currentTurn } = useGameLoopSelectors();

  return (
    <div className={styles.TurnInfo}>
      <div>Текущий ход: {currentTurn}</div>
      <div>Ходит: {activePlayer === 'ai' ? 'компьютер' : 'игрок'}</div>
    </div>
  );
};
