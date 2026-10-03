import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AiPlayback } from '@shared/config';

type Offset = { x: number; y: number };

/** Мини-карта поверх карты: непрозрачная, полупрозрачная или скрыта. */
export type MinimapMode = 'solid' | 'translucent' | 'hidden';

type PreferencesState = {
  /**
   * Партия (номер из журнала), в которой игрок отключил вопрос перед
   * концом хода. Не сохраняется в браузере: новая партия и перезагрузка
   * снова включают вопрос.
   */
  endTurnQuietGame: number | null;
  setEndTurnQuietGame: (gameId: number | null) => void;
  /** Сдвиг нижней панели действий от её места по умолчанию, px. */
  actionBarOffset: Offset;
  setActionBarOffset: (offset: Offset) => void;
  minimapMode: MinimapMode;
  setMinimapMode: (mode: MinimapMode) => void;
  hintsEnabled: boolean;
  setHintsEnabled: (enabled: boolean) => void;
  tutorialEnabled: boolean;
  setTutorialEnabled: (enabled: boolean) => void;
  /** Автозапуск только при первой обычной партии с человеком. */
  tutorialStarted: boolean;
  markTutorialStarted: () => void;
  aiPlayback: AiPlayback;
  setAiPlayback: (playback: AiPlayback) => void;
};

/**
 * Предпочтения игрока в интерфейсе. В браузере сохраняются положение
 * панели действий, вид мини-карты, настройки помощника и скорость ИИ;
 * предупреждение конца хода живёт до перезагрузки.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      endTurnQuietGame: null,
      setEndTurnQuietGame: endTurnQuietGame => set({ endTurnQuietGame }),
      actionBarOffset: { x: 0, y: 0 },
      setActionBarOffset: actionBarOffset => set({ actionBarOffset }),
      minimapMode: 'solid',
      setMinimapMode: minimapMode => set({ minimapMode }),
      hintsEnabled: true,
      setHintsEnabled: hintsEnabled => set({ hintsEnabled }),
      tutorialEnabled: true,
      setTutorialEnabled: tutorialEnabled => set({ tutorialEnabled }),
      tutorialStarted: false,
      markTutorialStarted: () => set({ tutorialStarted: true }),
      aiPlayback: 'normal',
      setAiPlayback: aiPlayback => set({ aiPlayback }),
    }),
    {
      name: 'simplewar:preferences',
      // v1 хранил «больше не спрашивать» навсегда — его отбрасываем.
      version: 2,
      partialize: ({
        actionBarOffset,
        minimapMode,
        hintsEnabled,
        tutorialEnabled,
        tutorialStarted,
        aiPlayback,
      }) => ({
        actionBarOffset,
        minimapMode,
        hintsEnabled,
        tutorialEnabled,
        tutorialStarted,
        aiPlayback,
      }),
      migrate: persisted => ({
        actionBarOffset: (persisted as Partial<PreferencesState> | null)
          ?.actionBarOffset ?? { x: 0, y: 0 },
      }),
    },
  ),
);
