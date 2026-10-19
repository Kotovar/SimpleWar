import { create } from 'zustand';
import {
  centerCameraOn,
  clampCamera,
  getFitCellSize,
  withDevtools,
  zoomCameraAt,
  type Camera,
  type ViewportSize,
} from '@shared/lib';
import {
  CAMERA_EDGE_MARGIN,
  CELL_SIZE,
  CELL_SIZE_LIMITS,
  DEFAULT_AI_SETUP,
  MAP_PRESETS,
  TEMP_START_SEED,
  type AiSetup,
  type Position,
} from '@shared/config';

type MapGenerationMode = 'random' | 'fixed';

type SettingsState = {
  gridColumns: number;
  gridRows: number;
  /** Масштаб камеры: размер клетки в CSS-пикселях. */
  cellSize: number;
  /** Левый верхний угол окна карты в клетках мира. */
  camera: Camera;
  /** Размер области карты на экране; не зависит от размера мира. */
  viewport: ViewportSize;

  mapGenerationMode: MapGenerationMode;
  customSeed: number;
  /** Профиль и сложность ИИ обычной партии (S17–S17a). */
  aiSetup: AiSetup;

  setMapGenerationMode: (mode: MapGenerationMode) => void;
  setCustomSeed: (seed: number) => void;
  setAiSetup: (patch: Partial<AiSetup>) => void;
  setGridSize: (columns: number, rows: number) => void;
  /** Масштаб на `steps` шагов к точке экрана; по умолчанию к центру окна. */
  zoomBy: (steps: number, anchor?: Position) => void;
  resetZoom: () => void;
  setViewport: (width: number, height: number) => void;
  /** Сдвигает камеру на экранное расстояние в CSS-пикселях. */
  panBy: (dx: number, dy: number) => void;
  /** Ставит точку мира в центр окна; `smooth` — плавно, если разрешено движение. */
  centerOn: (x: number, y: number, smooth?: boolean) => void;
  /** Масштаб, при котором весь мир виден целиком. */
  fitWorld: () => void;
  resetStore: () => void;
};

type Draft = Pick<
  SettingsState,
  'gridColumns' | 'gridRows' | 'cellSize' | 'camera' | 'viewport'
>;

const clampSize = (size: number) =>
  Math.round(
    Math.min(CELL_SIZE_LIMITS.max, Math.max(CELL_SIZE_LIMITS.min, size)),
  );

/** Камера в пределах мира; вызывается после любого изменения вида. */
const settle = (state: Draft, camera: Camera) => {
  state.camera = clampCamera(
    camera,
    state.cellSize,
    state.viewport,
    { columns: state.gridColumns, rows: state.gridRows },
    CAMERA_EDGE_MARGIN,
  );
};

/** Меняет масштаб, удерживая точку под `anchor`. */
const zoomTo = (state: Draft, size: number, anchor?: Position) => {
  const next = clampSize(size);
  const point = anchor ?? {
    x: state.viewport.width / 2,
    y: state.viewport.height / 2,
  };
  const camera = zoomCameraAt(state.camera, state.cellSize, next, point);
  state.cellSize = next;
  settle(state, camera);
};

const DEFAULTS = {
  gridColumns: MAP_PRESETS.large.cols,
  gridRows: MAP_PRESETS.large.rows,
  cellSize: CELL_SIZE,
  camera: { x: 0, y: 0 },
  viewport: { width: 0, height: 0 },
  mapGenerationMode: 'random' as MapGenerationMode,
  customSeed: TEMP_START_SEED,
  aiSetup: DEFAULT_AI_SETUP,
};

let cameraFrame = 0;

export const useSettingsStore = create<SettingsState>()(
  withDevtools('settings', (set, get) => ({
    ...DEFAULTS,

    setMapGenerationMode: mode =>
      set(state => {
        state.mapGenerationMode = mode;
      }),

    setCustomSeed: seed =>
      set(state => {
        state.customSeed = seed;
      }),

    setAiSetup: patch =>
      set(state => {
        state.aiSetup = { ...state.aiSetup, ...patch };
      }),

    zoomBy: (steps, anchor) =>
      set(state => {
        zoomTo(state, state.cellSize * CELL_SIZE_LIMITS.step ** steps, anchor);
      }),

    resetZoom: () =>
      set(state => {
        zoomTo(state, CELL_SIZE);
      }),

    setViewport: (width, height) =>
      set(state => {
        state.viewport = { width, height };
        settle(state, state.camera);
      }),

    panBy: (dx, dy) =>
      set(state => {
        settle(state, {
          x: state.camera.x + dx / state.cellSize,
          y: state.camera.y + dy / state.cellSize,
        });
      }),

    centerOn: (x, y, smooth = false) => {
      if (cameraFrame) cancelAnimationFrame(cameraFrame);
      cameraFrame = 0;
      const state = get();
      const { camera: from, cellSize, viewport } = state;
      const target = clampCamera(
        centerCameraOn({ x, y }, cellSize, viewport),
        cellSize,
        viewport,
        { columns: state.gridColumns, rows: state.gridRows },
        CAMERA_EDGE_MARGIN,
      );
      if (
        !smooth ||
        typeof requestAnimationFrame === 'undefined' ||
        globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        set(state => {
          state.camera = target;
        });
        return;
      }
      const start = performance.now();
      let expected = from;
      const tick = (time: number) => {
        cameraFrame = 0;
        // Ввод, смена масштаба, размера окна или сброс имеют приоритет.
        const current = get();
        if (
          current.camera !== expected ||
          current.cellSize !== cellSize ||
          current.viewport !== viewport
        )
          return;
        const progress = Math.min(1, (time - start) / 420);
        const ease = 1 - (1 - progress) ** 3;
        set(state => {
          state.camera = {
            x: from.x + (target.x - from.x) * ease,
            y: from.y + (target.y - from.y) * ease,
          };
        });
        expected = get().camera;
        if (progress < 1) cameraFrame = requestAnimationFrame(tick);
      };
      cameraFrame = requestAnimationFrame(tick);
    },

    fitWorld: () =>
      set(state => {
        state.cellSize = clampSize(
          getFitCellSize(state.viewport, {
            columns: state.gridColumns,
            rows: state.gridRows,
          }),
        );
        settle(
          state,
          centerCameraOn(
            { x: state.gridColumns / 2, y: state.gridRows / 2 },
            state.cellSize,
            state.viewport,
          ),
        );
      }),

    setGridSize: (columns: number, rows: number) =>
      set(state => {
        state.gridColumns = columns;
        state.gridRows = rows;
        settle(state, state.camera);
      }),

    resetStore: () => {
      set(state => {
        // Размер окна — свойство экрана, а не партии: его не сбрасываем.
        Object.assign(state, { ...DEFAULTS, viewport: state.viewport });
      });
    },
  })),
);
