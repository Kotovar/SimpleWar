import type { ReactNode } from 'react';
import { GAME_TITLE } from '@shared/config';
import { useGameLoopStore } from '@entities/games';
import { useGameLoopSelectors } from '@features/game-loop';
import { PhaseSetup } from './PhaseSetup';
import { PhaseInProgress } from './PhaseInProgress';
import { PhaseGameOver } from './PhaseGameOver';
import styles from './styles.module.css';

type Props = {
  onStartGame: () => void;
  onOpenSaves?: () => void;
  /** Мини-карта для панели партии: собирается слоем выше. */
  minimap?: ReactNode;
};

export const GameControls = ({ onStartGame, onOpenSaves, minimap }: Props) => {
  const { phase } = useGameLoopSelectors();
  const review = useGameLoopStore(state => state.reviewWorld);
  const showMap = phase === 'inProgress' || (phase === 'gameOver' && review);

  return (
    <section className={showMap ? styles.GameLayout : styles.GameControls}>
      {!showMap && <h1 className={styles.Title}>{GAME_TITLE}</h1>}

      {phase === 'setup' && (
        <PhaseSetup onStartGame={onStartGame} onOpenSaves={onOpenSaves} />
      )}
      {phase === 'inProgress' && (
        <PhaseInProgress minimap={minimap} onOpenSaves={onOpenSaves} />
      )}
      {phase === 'gameOver' && (
        <PhaseGameOver minimap={minimap} onOpenSaves={onOpenSaves} />
      )}
    </section>
  );
};
