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
      <label className={styles.Row}>
        <input
          type='checkbox'
          checked={!muted}
          onChange={event => setMuted(!event.target.checked)}
        />
        Включён
      </label>
      <label className={styles.Row}>
        <span className={styles.Name}>Музыка</span>
        <input
          type='range'
          min={0}
          max={1}
          step={0.05}
          value={musicVolume}
          disabled={muted}
          onChange={event => setMusicVolume(Number(event.target.value))}
        />
      </label>
      <label className={styles.Row}>
        <span className={styles.Name}>Эффекты</span>
        <input
          type='range'
          min={0}
          max={1}
          step={0.05}
          value={sfxVolume}
          disabled={muted}
          onChange={event => setSfxVolume(Number(event.target.value))}
        />
      </label>
    </fieldset>
  );
};
