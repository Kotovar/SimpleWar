import { useEffect } from 'react';
import { Map } from '@widgets/map';
import { useStartGame } from '@widgets/start-game';
import { GameControls } from '@widgets/game-controls';
import { useGameLoopSelectors } from '@features/game-loop';
import { runAITurn } from './ai';
import styles from './styles.module.css';

export const Game = () => {
  const startGame = useStartGame();
  const { activePlayer } = useGameLoopSelectors();

  useEffect(() => {
    if (activePlayer === 'ai') {
      runAITurn();
    }
  }, [activePlayer]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  return (
    <main className={styles.Main}>
      <Map />
      <GameControls />
    </main>
  );
};
