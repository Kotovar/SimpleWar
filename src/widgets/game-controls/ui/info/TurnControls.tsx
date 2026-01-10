import { useGameLoopSelectors } from '@features/game-loop';
import styles from './TurnControls.styles.module.css';

type Props = {
  onNextTurn: () => void;
  onReset: () => void;
};

export const TurnControls = ({ onNextTurn, onReset }: Props) => {
  const { activePlayer } = useGameLoopSelectors();

  return (
    <div className={styles.ButtonRow}>
      <button
        className={styles.EndTurnButton}
        onClick={onNextTurn}
        disabled={activePlayer === 'ai'}
      >
        Завершить ход
      </button>

      <button className={styles.DangerButton} onClick={onReset}>
        Сбросить игру
      </button>
    </div>
  );
};
