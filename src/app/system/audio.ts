import { audio } from '@shared/lib';
import { useAudioSettingsStore } from '@entities/settings';
import { getHumanId, useGameLoopStore } from '@entities/games';

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

  const syncMusic = () => {
    const { phase, winner, participants } = useGameLoopStore.getState();
    const humanId = getHumanId(participants);
    audio.setMusicState({
      phase,
      outcome:
        phase !== 'gameOver'
          ? null
          : winner && winner === humanId
            ? 'victory'
            : 'defeat',
      ...(phase !== 'inProgress' && { combat: false }),
    });
  };
  syncMusic();

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
