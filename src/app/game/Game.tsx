import { useEffect, useState } from 'react';
import {
  AI_TURN_DELAY_MS,
  type Participant,
  type ParticipantId,
} from '@shared/config';
import { ConfirmDialog } from '@shared/ui';
import { useJournalStore } from '@entities/journals';
import { useDebugStore, useSettingsStore } from '@entities/settings';
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
  const debug = useDebugStore(state => state.enabled);
  const gameId = useJournalStore(state => state.gameId);
  // ИИ не смог завершить ход: без решения игрока партия стоит. Номер
  // партии не даёт вопросу пережить сброс.
  const [stall, setStall] = useState<{
    actor: ParticipantId;
    gameId: number;
  } | null>(null);
  const stalled =
    stall?.gameId === gameId && phase === 'inProgress' ? stall.actor : null;
  const stalledDetail = useJournalStore(state =>
    stalled
      ? state.errors.findLast(
          error => error.actor === stalled && error.kind === 'failure',
        )?.detail
      : undefined,
  );

  const playAi = (actor: ParticipantId) => {
    const started = useJournalStore.getState().gameId;
    void runAITurn(actor).then(result => {
      if (result?.stalled) setStall({ actor, gameId: started });
    });
  };
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
        : () => playAi(activePlayer);
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
      <ConfirmDialog
        isOpen={stalled !== null}
        title='Противник не завершил ход'
        message='Ход прервала внутренняя ошибка игры. Можно повторить ход противника; если ошибка повторится — начните новую партию через «Меню».'
        confirmText='Повторить ход'
        cancelText='Закрыть'
        onConfirm={() => {
          if (stalled) playAi(stalled);
          setStall(null);
        }}
        onCancel={() => setStall(null)}
      >
        {debug && stalledDetail && <code>{stalledDetail}</code>}
      </ConfirmDialog>
    </main>
  );
};
