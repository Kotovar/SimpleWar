import { audio, gameEvents, isHostile } from '@shared/lib';
import { useAudioSettingsStore } from '@entities/settings';
import { getHumanId, useGameLoopStore } from '@entities/games';
import { COMBAT_MUSIC_HOLD_TURNS } from '@shared/config';

// Подписки общие для всех партий: повторное монтирование Game их не дублирует.
let initialized = false;

/**
 * Связывает звук с настройками и состоянием партии: громкость, тема по
 * стадии и итогу, сигнал начала своего хода и щелчки кнопок. Звук
 * разблокируется первым действием пользователя (политика браузера).
 * События карты (бой, стройка, угроза) озвучивает слой объектов карты:
 * только он знает, что видит игрок.
 */
export const initAudioSystem = () => {
  if (initialized) return;
  initialized = true;

  const settings = useAudioSettingsStore;
  audio.setVolumes(settings.getState());
  settings.subscribe(state => audio.setVolumes(state));

  const unlock = () => audio.unlock();
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener(
    'click',
    event => {
      if (event.target instanceof Element && event.target.closest('button')) {
        audio.play('click');
      }
    },
    { capture: true },
  );

  let lastAttackTurn: number | null = null;
  const syncMusic = () => {
    const { phase, winner, participants, currentTurn } =
      useGameLoopStore.getState();
    if (
      phase !== 'inProgress' ||
      (lastAttackTurn !== null &&
        (currentTurn < lastAttackTurn ||
          currentTurn - lastAttackTurn >= COMBAT_MUSIC_HOLD_TURNS))
    )
      lastAttackTurn = null;
    const humanId = getHumanId(participants);
    audio.setMusicState({
      phase,
      recentAttack: lastAttackTurn !== null,
      outcome:
        phase !== 'gameOver'
          ? null
          : winner && humanId && !isHostile(humanId, winner, participants)
            ? 'victory'
            : 'defeat',
      ...(phase !== 'inProgress' && { combat: false }),
    });
  };
  syncMusic();

  gameEvents.subscribe(event => {
    const { participants, phase, currentTurn, activePlayer } =
      useGameLoopStore.getState();
    const humanId = getHumanId(participants);
    if (event.type === 'SITE_CLAIMED' && event.owner === humanId) {
      audio.play('siteClaim');
    }
    if (event.type === 'GAME_RESET') {
      lastAttackTurn = null;
      syncMusic();
    }
    if (
      event.type === 'ATTACK_LANDED' &&
      phase === 'inProgress' &&
      humanId &&
      event.damage > 0 &&
      'movePoints' in event.target &&
      !isHostile(humanId, event.target.owner, participants) &&
      isHostile(humanId, activePlayer, participants)
    ) {
      lastAttackTurn = currentTurn;
      syncMusic();
    }
  });

  useGameLoopStore.subscribe((state, previous) => {
    syncMusic();
    const humanId = getHumanId(state.participants);
    if (
      state.phase === 'inProgress' &&
      humanId &&
      state.activePlayer === humanId &&
      (previous.activePlayer !== humanId || previous.phase !== 'inProgress')
    ) {
      audio.play('turnStart');
    }
  });
};
