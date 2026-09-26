import { useEffect } from 'react';
import { AI_TURN_DELAY_MS } from '@shared/config';
import { initGameLoopEvents, useGameLoopSelectors } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { Map, Minimap } from '@widgets/map';
import { initializeGame } from '@widgets/start-game';
import { GameControls } from '@widgets/game-controls';
import { initJournalSystem, initPopulationSystem } from '@app/system';
import { runAITurn } from '@app/game/ai';
import styles from './styles.module.css';

export const Game = () => {
  const { activePlayer, activeController, phase, startGame } =
    useGameLoopSelectors();

  const handleStartGame = () => {
    if (initializeGame()) startGame();
  };

  useEffect(() => {
    initGameLoopEvents();
    initPopulationSystem();
    initJournalSystem();
    initVisibilitySystem();
  }, []);

  useEffect(() => {
    if (activeController !== 'ai' || phase !== 'inProgress') return;

    const timer = setTimeout(() => runAITurn(activePlayer), AI_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [activePlayer, activeController, phase]);

  return (
    <main className={phase === 'inProgress' ? styles.Main : styles.Setup}>
      {phase === 'inProgress' && <Map />}
      <GameControls onStartGame={handleStartGame} minimap={<Minimap />} />
    </main>
  );
};
