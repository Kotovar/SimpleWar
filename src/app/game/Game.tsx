import { useEffect } from 'react';
import { AI_TURN_DELAY_MS, type Participant } from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import {
  initGameLoopEvents,
  nextTurn,
  useGameLoopSelectors,
} from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initBattleStats, useSandboxStore } from '@features/sandbox';
import { Map, Minimap } from '@widgets/map';
import { initializeGame, initializeSandbox } from '@widgets/start-game';
import { GameControls } from '@widgets/game-controls';
import {
  initAudioSystem,
  initJournalSystem,
  initPopulationSystem,
} from '@app/system';
import { runAITurn } from '@app/game/ai';
import styles from './styles.module.css';

/** Пауза перед ходом в ускоренном режиме тестирования, мс. */
const FAST_TURN_DELAY_MS = 30;

export const Game = () => {
  const { activePlayer, activeController, phase, startGame } =
    useGameLoopSelectors();
  const sandbox = useSandboxStore(state => state.enabled);
  const paused = useSandboxStore(state => state.paused);
  const fast = useSandboxStore(state => state.fast);

  const handleStartGame = () => {
    if (!sandbox) {
      const participants: Participant[] = [
        { id: 'p1', controller: 'human' },
        { id: 'p2', controller: 'ai', ai: useSettingsStore.getState().aiSetup },
      ];
      if (initializeGame(participants)) startGame(participants);
      return;
    }
    const started = initializeSandbox(useSandboxStore.getState().scenario);
    if (started) startGame(started.participants);
  };

  useEffect(() => {
    initGameLoopEvents();
    initPopulationSystem();
    initJournalSystem();
    initVisibilitySystem();
    initBattleStats();
    initAudioSystem();
  }, []);

  useEffect(() => {
    if (phase !== 'inProgress' || !activeController) return;
    if (activeController === 'human' || (sandbox && paused)) return;

    // Пассивная сторона режима тестирования сразу передаёт ход.
    const play =
      activeController === 'passive'
        ? () => nextTurn(activePlayer)
        : () => void runAITurn(activePlayer);
    const timer = setTimeout(
      play,
      sandbox && fast ? FAST_TURN_DELAY_MS : AI_TURN_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [activePlayer, activeController, phase, sandbox, paused, fast]);

  return (
    <main className={phase === 'inProgress' ? styles.Main : styles.Setup}>
      {phase === 'inProgress' && <Map />}
      <GameControls onStartGame={handleStartGame} minimap={<Minimap />} />
    </main>
  );
};
