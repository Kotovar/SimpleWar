import { PALETTES } from '@shared/config';
import { getRelation } from '@shared/lib';
import { useParticipantPalette } from '@entities/games';
import { useGameLoopSelectors } from '@features/game-loop';
import { useDebugStore } from '@entities/settings';
import { useSandboxStore } from '@features/sandbox';
import { TurnQueue } from './TurnQueue';
import styles from './TurnInfo.styles.module.css';

export const TurnInfo = () => {
  const { activePlayer, humanId, currentTurn, participants, eliminated } =
    useGameLoopSelectors();
  const isOwnTurn = activePlayer === humanId;
  const palette = useParticipantPalette(activePlayer);
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
        data-relation={
          humanId ? getRelation(humanId, activePlayer, participants) : 'hostile'
        }
        style={{ ['--side-color' as string]: PALETTES[palette].color }}
      >
        {isOwnTurn ? 'Ваш ход' : `Ходят ${PALETTES[palette].name}`}
      </span>
      <TurnQueue />
      {humanId && eliminated.includes(humanId) && (
        <span role='status'>Вы выбыли · Наблюдение за союзником</span>
      )}
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
