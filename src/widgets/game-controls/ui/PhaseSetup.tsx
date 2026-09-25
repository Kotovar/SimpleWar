import { useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { MAP_PRESET_LABELS, MAP_PRESETS } from '@shared/config';
import { isValidSeed } from '@entities/maps';
import { useSettingsSelectors } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import styles from './styles.module.css';

/** Только цифры; остальное (`0.5`, `-1`, `0x1`, `1e3`) — NaN. */
const parseSeed = (text: string) => {
  const value = text.trim();
  return /^\d+$/.test(value) ? Number(value) : NaN;
};

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

  // Текст поля хранится отдельно от стора: неверный ввод остаётся в поле
  // как есть и подсвечивается. После неудачного старта с пустым вводом
  // в сторе NaN — поле остаётся пустым.
  const [seedText, setSeedText] = useState(() =>
    Number.isFinite(customSeed) ? String(customSeed) : '',
  );
  const seedValue = parseSeed(seedText);
  const isSeedValid = isValidSeed(seedValue);

  const handleSeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSeedText(e.target.value);
    // Неразборчивый ввод не оставляет в сторе прежний сид: старт покажет
    // ошибку, а не запустит другую карту.
    setCustomSeed(parseSeed(e.target.value));
  };

  return (
    <div className={styles.Wrapper}>
      <section className={styles.Section}>
        <div className={styles.Label}>Размер карты</div>
        <div className={clsx(styles.ButtonGroup, styles.SizeGroup)}>
          {Object.entries(MAP_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={clsx(styles.ToggleButton, {
                [styles.Active]: gridRows === preset.rows,
              })}
              aria-pressed={gridRows === preset.rows}
              onClick={() => setGridSize(preset.cols, preset.rows)}
            >
              <span className={styles.ToggleTitle}>
                {MAP_PRESET_LABELS[key as keyof typeof MAP_PRESETS]}
              </span>
              <span className={styles.ToggleMeta}>
                {preset.cols} × {preset.rows}
              </span>
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
            aria-pressed={mapGenerationMode === 'random'}
            onClick={() => setMapGenerationMode('random')}
          >
            Случайная
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: mapGenerationMode === 'fixed',
            })}
            aria-pressed={mapGenerationMode === 'fixed'}
            onClick={() => setMapGenerationMode('fixed')}
          >
            Фиксированный сид
          </button>
        </div>

        {mapGenerationMode === 'fixed' && (
          <div className={styles.SeedInputWrapper}>
            <label className={styles.SeedLabel}>
              Сид:
              <input
                type='text'
                inputMode='numeric'
                autoComplete='off'
                spellCheck={false}
                value={seedText}
                onChange={handleSeedChange}
                aria-invalid={!isSeedValid}
                className={styles.SeedInput}
                name='seed'
              />
            </label>

            <p className={styles.SeedWarning}>
              Целое число, например 12354. Непроходимая карта не будет запущена
              — в таком случае измените сид.
            </p>
          </div>
        )}
      </section>

      <section className={styles.Section}>
        {startError && (
          <p role='alert' className={styles.Error}>
            {startError}
          </p>
        )}
        <button className={styles.PrimaryButton} onClick={startGame}>
          Начать игру
        </button>
      </section>
    </div>
  );
};
