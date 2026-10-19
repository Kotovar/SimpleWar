import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { DEFAULT_AUDIO } from '@shared/config';
import { useAudioSettingsStore } from './audioStore';

describe('useAudioSettingsStore', () => {
  beforeEach(() => useAudioSettingsStore.setState(DEFAULT_AUDIO));

  it('держит громкость в пределах 0..1 и отдельно для музыки и эффектов', () => {
    const { setMusicVolume, setSfxVolume } = useAudioSettingsStore.getState();
    setMusicVolume(2);
    setSfxVolume(Number.NaN);

    expect(useAudioSettingsStore.getState()).toMatchObject({
      musicVolume: 1,
      sfxVolume: 0,
    });
  });

  it('отключение не теряет громкость', () => {
    useAudioSettingsStore.getState().setMuted(true);

    expect(useAudioSettingsStore.getState()).toMatchObject({
      muted: true,
      musicVolume: DEFAULT_AUDIO.musicVolume,
    });
  });
});
