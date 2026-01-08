import clsx from 'clsx';
import { MAP_PRESET_LABELS, MAP_PRESETS } from '@shared/config';
import { useSettingsSelectors } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import styles from './styles.module.css';

export const PhaseSetup = () => {
  const { canvasWidth, gridRows, setCanvasSize, setGridSize } =
    useSettingsSelectors();

  const { startGame } = useGameLoopSelectors();

  return (
    <div className={styles.Wrapper}>
      <section className={styles.Section}>
        <div className={styles.Label}>Размер карты</div>
        <div className={styles.ButtonGroup}>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: canvasWidth === MAP_PRESETS.small.canvas.w,
            })}
            onClick={() =>
              setCanvasSize(
                MAP_PRESETS.small.canvas.w,
                MAP_PRESETS.small.canvas.h,
              )
            }
          >
            {MAP_PRESET_LABELS.small.canvas}
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: canvasWidth === MAP_PRESETS.medium.canvas.w,
            })}
            onClick={() =>
              setCanvasSize(
                MAP_PRESETS.medium.canvas.w,
                MAP_PRESETS.medium.canvas.h,
              )
            }
          >
            {MAP_PRESET_LABELS.medium.canvas}
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: canvasWidth === MAP_PRESETS.large.canvas.w,
            })}
            onClick={() =>
              setCanvasSize(
                MAP_PRESETS.large.canvas.w,
                MAP_PRESETS.large.canvas.h,
              )
            }
          >
            {MAP_PRESET_LABELS.large.canvas}
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: canvasWidth === MAP_PRESETS.extra.canvas.w,
            })}
            onClick={() =>
              setCanvasSize(
                MAP_PRESETS.extra.canvas.w,
                MAP_PRESETS.extra.canvas.h,
              )
            }
          >
            {MAP_PRESET_LABELS.extra.canvas}
          </button>
        </div>
      </section>

      <section className={styles.Section}>
        <div className={styles.Label}>Количество клеток</div>
        <div className={styles.ButtonGroup}>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: gridRows === MAP_PRESETS.small.grid.rows,
            })}
            onClick={() =>
              setGridSize(
                MAP_PRESETS.small.grid.cols,
                MAP_PRESETS.small.grid.rows,
              )
            }
          >
            {MAP_PRESET_LABELS.small.grid}
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: gridRows === MAP_PRESETS.medium.grid.rows,
            })}
            onClick={() =>
              setGridSize(
                MAP_PRESETS.medium.grid.cols,
                MAP_PRESETS.medium.grid.rows,
              )
            }
          >
            {MAP_PRESET_LABELS.medium.grid}
          </button>
          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: gridRows === MAP_PRESETS.large.grid.rows,
            })}
            onClick={() =>
              setGridSize(
                MAP_PRESETS.large.grid.cols,
                MAP_PRESETS.large.grid.rows,
              )
            }
          >
            {MAP_PRESET_LABELS.large.grid}
          </button>

          <button
            className={clsx(styles.ToggleButton, {
              [styles.Active]: gridRows === MAP_PRESETS.extra.grid.rows,
            })}
            onClick={() =>
              setGridSize(
                MAP_PRESETS.extra.grid.cols,
                MAP_PRESETS.extra.grid.rows,
              )
            }
          >
            {MAP_PRESET_LABELS.extra.grid}
          </button>
        </div>
      </section>

      <section className={styles.Section}>
        <button className={styles.PrimaryButton} onClick={startGame}>
          Начать игру
        </button>
      </section>
    </div>
  );
};
