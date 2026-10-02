import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
};

/**
 * Предпочтения игрока в интерфейсе. В браузере сохраняются положение
 * панели действий и вид мини-карты; остальное живёт до перезагрузки.
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
    }),
    {
      name: 'simplewar:preferences',
      // v1 хранил «больше не спрашивать» навсегда — его отбрасываем.
      version: 2,
      partialize: ({ actionBarOffset, minimapMode }) => ({
        actionBarOffset,
        minimapMode,
      }),
      migrate: persisted => ({
        actionBarOffset: (persisted as Partial<PreferencesState> | null)
          ?.actionBarOffset ?? { x: 0, y: 0 },
      }),
    },
  ),
);
