import { useGameLoopSelectors } from '@features/game-loop';
import { useDebugStore } from '@entities/settings';
import { useMapStore } from '@entities/maps';
import { MAP_GENERATOR_VERSION } from '@shared/config';
import styles from './TurnInfo.styles.module.css';

export const TurnInfo = () => {
  const { activePlayer, humanId, currentTurn } = useGameLoopSelectors();
  const isOwnTurn = activePlayer === humanId;
  const isDebug = useDebugStore(state => state.enabled);
  const seed = useMapStore(state => state.seed);
  const usedFallback = useMapStore(state => state.usedFallback);

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
      {isDebug && seed !== null && (
        <span className={styles.MapMeta} title='Сид и версия генератора карты'>
          Карта: {seed} · v{MAP_GENERATOR_VERSION}
          {usedFallback ? ' · резервная' : ''}
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
