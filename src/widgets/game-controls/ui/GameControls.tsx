import { GAME_TITLE } from '@shared/config';
import { useGameLoopSelectors } from '@features/game-loop';
import { PhaseSetup } from './PhaseSetup';
import { PhaseInProgress } from './PhaseInProgress';
import { PhaseGameOver } from './PhaseGameOver';
import styles from './styles.module.css';

export const GameControls = () => {
  const { phase } = useGameLoopSelectors();

  return (
    <section
      className={
        phase === 'inProgress' ? styles.GameLayout : styles.GameControls
      }
    >
      {phase !== 'inProgress' && <h1 className={styles.Title}>{GAME_TITLE}</h1>}

      {phase === 'setup' && <PhaseSetup />}
      {phase === 'inProgress' && <PhaseInProgress />}
      {phase === 'gameOver' && <PhaseGameOver />}
    </section>
  );
};
