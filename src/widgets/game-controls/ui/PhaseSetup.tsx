import type { ChangeEvent } from 'react';
import clsx from 'clsx';
import { MAP_PRESET_LABELS, MAP_PRESETS } from '@shared/config';
import { useSettingsSelectors } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import styles from './styles.module.css';

export const PhaseSetup = () => {
  const {
    gridRows,
    mapGenerationMode,
    customSeed,
    setGridSize,
    setCustomSeed,
    setMapGenerationMode,
  } = useSettingsSelectors();

  const { startGame, startError } = useGameLoopSelectors();

  const handleSeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);

    if (!isNaN(value)) {
      setCustomSeed(value);
    }
  };

  return (
    <div className={styles.Wrapper}>
      <section className={styles.Section}>
        <div className={styles.Label}>Размер карты</div>
        <div className={styles.ButtonGroup}>
          {Object.entries(MAP_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={clsx(styles.ToggleButton, {
                [styles.Active]: gridRows === preset.rows,
              })}
              aria-pressed={gridRows === preset.rows}
              onClick={() => setGridSize(preset.cols, preset.rows)}
            >
              {MAP_PRESET_LABELS[key as keyof typeof MAP_PRESETS]} (
              {preset.cols} × {preset.rows})
            </button>
          ))}
        </div>
      </section>

      <section className={styles.Section}>
        <div className={styles.Label}>Генерация карты</div>
        <div className={styles.ButtonGroup}>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: mapGenerationMode === 'random',
            })}
            onClick={() => setMapGenerationMode('random')}
          >
            Случайная
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: mapGenerationMode === 'fixed',
            })}
            onClick={() => setMapGenerationMode('fixed')}
          >
            Фиксированный сид
          </button>
        </div>

        {mapGenerationMode === 'fixed' && (
          <div className={styles.SeedInputWrapper}>
            <label className={styles.SeedLabel}>
              Сид (0.0 – 1.0):
              <input
                type='number'
                step='0.0001'
                min='0'
                max='1'
                value={customSeed}
                onChange={handleSeedChange}
                className={styles.SeedInput}
                name='seed'
              />
            </label>

            <p className={styles.SeedWarning}>
              Непроходимая карта не будет запущена. В таком случае измените сид.
            </p>
          </div>
        )}
      </section>

      <section className={styles.Section}>
        {startError && <p role='alert'>{startError}</p>}
        <button className={styles.PrimaryButton} onClick={startGame}>
          Начать игру
        </button>
      </section>
    </div>
  );
};
