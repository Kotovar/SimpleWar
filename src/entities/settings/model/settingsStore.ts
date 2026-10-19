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
  DEFAULT_PALETTES,
  PALETTES,
  PARTICIPANT_IDS,
  MAP_PRESETS,
  MAX_PARTICIPANTS,
  TEMP_START_SEED,
  type AiSetup,
  type PaletteChoice,
  type PaletteChoices,
  type ParticipantId,
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
  /** Профиль и сложность каждого противника обычной партии. */
  aiSetups: AiSetup[];
  paletteChoices: PaletteChoices;

  setMapGenerationMode: (mode: MapGenerationMode) => void;
  setCustomSeed: (seed: number) => void;
  setAiCount: (count: number) => void;
  setAiSetup: (index: number, patch: Partial<AiSetup>) => void;
  setPaletteChoice: (owner: ParticipantId, choice: PaletteChoice) => void;
  setGridSize: (columns: number, rows: number) => void;
  /** Для 3–4 участников меньшая карта переключается на Большую. */
  fitMapTo: (participants: number) => void;
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
/** Для 3–4 участников — карта не меньше Большой (30 × 30). */
const fitMap = (state: Draft, participants: number) => {
  if (
    participants > 2 &&
    (state.gridColumns < MAP_PRESETS.large.cols ||
      state.gridRows < MAP_PRESETS.large.rows)
  ) {
    state.gridColumns = MAP_PRESETS.large.cols;
    state.gridRows = MAP_PRESETS.large.rows;
    settle(state, state.camera);
  }
};

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
  aiSetups: [DEFAULT_AI_SETUP],
  paletteChoices: { ...DEFAULT_PALETTES },
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

    setAiCount: count =>
      set(state => {
        if (!Number.isInteger(count) || count < 1 || count >= MAX_PARTICIPANTS)
          return;
        state.aiSetups = Array.from(
          { length: count },
          (_, index) => state.aiSetups[index] ?? { ...DEFAULT_AI_SETUP },
        );
        const used = new Set<PaletteChoice>();
        for (const id of PARTICIPANT_IDS.slice(0, count + 1)) {
          const choice = state.paletteChoices[id];
          if (choice === 'random') continue;
          if (used.has(choice)) state.paletteChoices[id] = 'random';
          else used.add(choice);
        }
        fitMap(state, count + 1);
      }),

    fitMapTo: participants => set(state => fitMap(state, participants)),

    setAiSetup: (index, patch) =>
      set(state => {
        if (state.aiSetups[index])
          state.aiSetups[index] = { ...state.aiSetups[index], ...patch };
      }),

    setPaletteChoice: (owner, choice) =>
      set(state => {
        if (choice !== 'random' && !Object.hasOwn(PALETTES, choice)) return;
        if (
          choice !== 'random' &&
          PARTICIPANT_IDS.slice(0, state.aiSetups.length + 1).some(
            id => id !== owner && state.paletteChoices[id] === choice,
          )
        )
          return;
        state.paletteChoices[owner] = choice;
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
