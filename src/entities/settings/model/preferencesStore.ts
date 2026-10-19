import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AiPlayback } from '@shared/config';

type Offset = { x: number; y: number };

/** Мини-карта поверх карты: непрозрачная, полупрозрачная или скрыта. */
export type MinimapMode = 'solid' | 'translucent' | 'hidden';

/** Качество сглаживания кромки тумана: `low` вдвое дешевле при панораме. */
export type FogQuality = 'high' | 'low';

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
  /**
   * Ускорение текущей очереди врагов: до возврата хода человеку ИИ ходит
   * без анимаций. Не сохраняется и не меняет `aiPlayback`.
   */
  aiRush: boolean;
  setAiRush: (rush: boolean) => void;
  fogQuality: FogQuality;
  setFogQuality: (quality: FogQuality) => void;
};

/** Действующая скорость показа ИИ: ускорение очереди — без анимаций. */
export const getAiPlayback = ({
  aiPlayback,
  aiRush,
}: Pick<PreferencesState, 'aiPlayback' | 'aiRush'>): AiPlayback =>
  aiRush ? 'instant' : aiPlayback;

/**
 * Предпочтения игрока в интерфейсе. В браузере сохраняются положение
 * панели действий, вид мини-карты, настройки помощника, скорость ИИ
 * и качество графики;
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
      aiRush: false,
      setAiRush: aiRush => set({ aiRush }),
      fogQuality: 'high',
      setFogQuality: fogQuality => set({ fogQuality }),
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
        fogQuality,
      }) => ({
        actionBarOffset,
        minimapMode,
        hintsEnabled,
        tutorialEnabled,
        tutorialStarted,
        aiPlayback,
        fogQuality,
      }),
      migrate: persisted => ({
        actionBarOffset: (persisted as Partial<PreferencesState> | null)
          ?.actionBarOffset ?? { x: 0, y: 0 },
      }),
    },
  ),
);
