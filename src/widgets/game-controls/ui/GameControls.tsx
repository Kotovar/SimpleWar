import type { ReactNode } from 'react';
import { GAME_TITLE } from '@shared/config';
import { useGameLoopSelectors } from '@features/game-loop';
import { PhaseSetup } from './PhaseSetup';
import { PhaseInProgress } from './PhaseInProgress';
import { PhaseGameOver } from './PhaseGameOver';
import styles from './styles.module.css';

type Props = {
  onStartGame: () => void;
  /** Мини-карта для панели партии: собирается слоем выше. */
  minimap?: ReactNode;
};

export const GameControls = ({ onStartGame, minimap }: Props) => {
  const { phase } = useGameLoopSelectors();

  return (
    <section
      className={
        phase === 'inProgress' ? styles.GameLayout : styles.GameControls
      }
    >
      {phase !== 'inProgress' && <h1 className={styles.Title}>{GAME_TITLE}</h1>}

      {phase === 'setup' && <PhaseSetup onStartGame={onStartGame} />}
      {phase === 'inProgress' && <PhaseInProgress minimap={minimap} />}
      {phase === 'gameOver' && <PhaseGameOver />}
    </section>
  );
};
