import { useEffect } from 'react';
import { initGameLoopEvents, useGameLoopSelectors } from '@features/game-loop';
import { Map } from '@widgets/map';
import { useStartGame } from '@widgets/start-game';
import { GameControls } from '@widgets/game-controls';
import { initPopulationSystem } from '@app/system';
import { runAITurn } from '@app/game/ai';
import styles from './styles.module.css';

export const Game = () => {
  const startGame = useStartGame();

  const { activePlayer, phase } = useGameLoopSelectors();

  useEffect(() => {
    initGameLoopEvents();
    initPopulationSystem();
  }, []);

  useEffect(() => {
    if (activePlayer === 'ai') {
      runAITurn();
    }
  }, [activePlayer]);

  useEffect(() => {
    if (phase === 'inProgress') {
      startGame();
    }
  }, [phase, startGame]);

  return (
    <main className={styles.Main}>
      <Map />
      <GameControls />
    </main>
  );
};
