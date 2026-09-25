import { useEffect } from 'react';
import { initGameLoopEvents, useGameLoopSelectors } from '@features/game-loop';
import { Map } from '@widgets/map';
import { initializeGame } from '@widgets/start-game';
import { GameControls } from '@widgets/game-controls';
import { initPopulationSystem } from '@app/system';
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
  }, []);

  useEffect(() => {
    if (activeController === 'ai' && phase === 'inProgress') {
      runAITurn();
    }
    // activePlayer в зависимостях: ход переходит от одного ИИ к другому.
  }, [activePlayer, activeController, phase]);

  return (
    <main className={phase === 'inProgress' ? styles.Main : styles.Setup}>
      {phase === 'inProgress' && <Map />}
      <GameControls onStartGame={handleStartGame} />
    </main>
  );
};
