import { OWNER_NAME } from '@shared/config';
import { useGameLoopSelectors } from '@features/game-loop';
import { useDebugStore } from '@entities/settings';
import { useSandboxStore } from '@features/sandbox';
import styles from './TurnInfo.styles.module.css';

export const TurnInfo = () => {
  const { activePlayer, humanId, currentTurn } = useGameLoopSelectors();
  const isOwnTurn = activePlayer === humanId;
  const isDebug = useDebugStore(state => state.enabled);
  const isSandbox = useSandboxStore(state => state.enabled);

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
        {isOwnTurn
          ? 'Ваш ход'
          : humanId
            ? 'Ходит противник'
            : `Ходят ${OWNER_NAME[activePlayer]}`}
      </span>
      {isSandbox && (
        <span className={styles.Debug} role='status'>
          Тест
        </span>
      )}
      {isDebug && (
        <span className={styles.Debug} role='status'>
          Отладка
        </span>
      )}
    </div>
  );
};
