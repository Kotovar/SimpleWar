import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_AUDIO } from '@shared/config';

type AudioSettingsState = typeof DEFAULT_AUDIO & {
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
};

const clamp = (volume: number) =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0;

/**
 * Громкость музыки и эффектов и общее отключение. Настройки игрока, а не
 * партии: сохраняются в браузере и переживают перезагрузку и новую игру.
 */
export const useAudioSettingsStore = create<AudioSettingsState>()(
  persist(
    set => ({
      ...DEFAULT_AUDIO,
      setMusicVolume: volume => set({ musicVolume: clamp(volume) }),
      setSfxVolume: volume => set({ sfxVolume: clamp(volume) }),
      setMuted: muted => set({ muted }),
    }),
    { name: 'simplewar:audio', version: 1 },
  ),
);
