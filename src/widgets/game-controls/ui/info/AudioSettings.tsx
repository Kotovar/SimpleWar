import { Checkbox, Slider } from '@shared/ui';
import { useAudioSettingsStore } from '@entities/settings';
import styles from './AudioSettings.styles.module.css';

/**
 * Громкость музыки и эффектов и общее отключение звука. Настройки
 * сохраняются в браузере; каждый звуковой сигнал дублируется на экране.
 */
export const AudioSettings = () => {
  const {
    musicVolume,
    sfxVolume,
    muted,
    setMusicVolume,
    setSfxVolume,
    setMuted,
  } = useAudioSettingsStore();

  return (
    <fieldset className={styles.Audio}>
      <legend className={styles.Legend}>Звук</legend>
      <Checkbox
        className={styles.Row}
        checked={!muted}
        onChange={checked => setMuted(!checked)}
      >
        Включён
      </Checkbox>
      <label className={styles.Row}>
        <span className={styles.Name}>Музыка</span>
        <Slider
          className={styles.Volume}
          min={0}
          max={1}
          step={0.05}
          value={musicVolume}
          disabled={muted}
          onChange={setMusicVolume}
        />
      </label>
      <label className={styles.Row}>
        <span className={styles.Name}>Эффекты</span>
        <Slider
          className={styles.Volume}
          min={0}
          max={1}
          step={0.05}
          value={sfxVolume}
          disabled={muted}
          onChange={setSfxVolume}
        />
      </label>
    </fieldset>
  );
};
