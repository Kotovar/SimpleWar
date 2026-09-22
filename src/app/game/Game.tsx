import { useEffect } from 'react';
import { initGameLoopEvents, useGameLoopSelectors } from '@features/game-loop';
import { Map } from '@widgets/map';
import { initializeGame } from '@widgets/start-game';
import { GameControls } from '@widgets/game-controls';
import { initPopulationSystem } from '@app/system';
import { runAITurn } from '@app/game/ai';
import styles from './styles.module.css';

export const Game = () => {
  const { activePlayer, phase } = useGameLoopSelectors();

  useEffect(() => {
    initGameLoopEvents();
    initPopulationSystem();
  }, []);

  useEffect(() => {
    if (activePlayer === 'ai' && phase === 'inProgress') {
      runAITurn();
    }
  }, [activePlayer, phase]);

  useEffect(() => {
    if (phase === 'inProgress') {
      initializeGame();
    }
  }, [phase]);

  return (
    <main className={styles.Main}>
      <Map />
      <GameControls />
    </main>
  );
};
