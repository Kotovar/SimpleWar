import { useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { GUIDEBOOK_URL, MAP_PRESET_LABELS, MAP_PRESETS } from '@shared/config';
import { TextField } from '@shared/ui';
import { isValidSeed } from '@entities/maps';
import { useSettingsSelectors } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { useSandboxStore } from '@features/sandbox';
import { AiSetupSection } from './AiSetupSection';
import { SandboxSetup } from './sandbox';
import { SoundCorner } from './SoundCorner';
import { StepLabel } from './StepLabel';
import styles from './styles.module.css';

type Props = {
  onStartGame: () => void;
  onOpenSaves?: () => void;
};

/** Только цифры; остальное (`0.5`, `-1`, `0x1`, `1e3`) — NaN. */
const parseSeed = (text: string) => {
  const value = text.trim();
  return /^\d+$/.test(value) ? Number(value) : NaN;
};

/**
 * Главное меню: шаги «режим → карта → противник» (в тестировании баланса —
 * составы сторон), сид — в свёрнутом блоке «Дополнительно», звук — в углу.
 */
export const PhaseSetup = ({ onStartGame, onOpenSaves }: Props) => {
  const {
    gridRows,
    mapGenerationMode,
    customSeed,
    setGridSize,
    setCustomSeed,
    setMapGenerationMode,
  } = useSettingsSelectors();

  const { startError } = useGameLoopSelectors();
  const sandbox = useSandboxStore(state => state.enabled);
  const setSandbox = useSandboxStore(state => state.setEnabled);

  // Текст поля хранится отдельно от стора: неверный ввод остаётся в поле
  // как есть и подсвечивается. После неудачного старта с пустым вводом
  // в сторе NaN — поле остаётся пустым.
  const [seedText, setSeedText] = useState(() =>
    Number.isFinite(customSeed) ? String(customSeed) : '',
  );
  const seedValue = parseSeed(seedText);
  const isSeedValid = isValidSeed(seedValue);
  // Блок открыт сразу, если сид уже задан. Значение не меняется — React
  // не трогает атрибут, и игрок сворачивает блок сам.
  const [moreOpen] = useState(mapGenerationMode === 'fixed');

  const handleSeedChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSeedText(e.target.value);
    // Неразборчивый ввод не оставляет в сторе прежний сид: старт покажет
    // ошибку, а не запустит другую карту.
    setCustomSeed(parseSeed(e.target.value));
  };

  return (
    <div
      className={clsx(styles.Wrapper, styles.SetupMenu)}
      data-sandbox={sandbox}
    >
      <SoundCorner />

      <section className={styles.Section}>
        <StepLabel step={1}>Режим</StepLabel>
        <div className={clsx(styles.ButtonGroup, styles.ModeGroup)}>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: !sandbox,
            })}
            aria-pressed={!sandbox}
            onClick={() => setSandbox(false)}
          >
            <span className={styles.ToggleTitle}>Обычная партия</span>
            <span className={styles.ToggleMeta}>Развитие и сражения</span>
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: sandbox,
            })}
            aria-pressed={sandbox}
            onClick={() => setSandbox(true)}
          >
            <span className={styles.ToggleTitle}>Тестирование баланса</span>
            <span className={styles.ToggleMeta}>
              Свой состав каждой стороны
            </span>
          </button>
        </div>
      </section>

      <section className={styles.Section}>
        <StepLabel step={2}>Карта</StepLabel>
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

        <details className={styles.More} open={moreOpen}>
          <summary>Дополнительно</summary>
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
                <TextField
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
                Целое число, например 12354. Непроходимая карта не будет
                запущена — в таком случае измените сид.
              </p>
            </div>
          )}
        </details>
      </section>

      {!sandbox && <AiSetupSection />}

      {sandbox && (
        <section className={styles.Section}>
          <StepLabel step={3}>Состав сторон</StepLabel>
          <SandboxSetup />
        </section>
      )}

      <section className={styles.Section}>
        {startError && (
          <p role='alert' className={styles.Error}>
            {startError}
          </p>
        )}
        <div className={styles.StartActions}>
          <button className={styles.PrimaryButton} onClick={onStartGame}>
            Начать игру
          </button>
          {onOpenSaves && (
            <button
              className={`${styles.ToggleButton} ${styles.SavesButton}`}
              onClick={onOpenSaves}
            >
              Сохранения
            </button>
          )}
        </div>
        <a
          className={styles.GuideLink}
          href={GUIDEBOOK_URL}
          target='_blank'
          rel='noopener'
          aria-label='Гайдбук: как устроена игра (откроется в новой вкладке)'
        >
          Гайдбук: как устроена игра <span aria-hidden='true'>↗</span>
        </a>
      </section>
    </div>
  );
};
