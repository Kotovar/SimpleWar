import 'normalize.css';
import '../src/app/index.css';

import type { Preview } from '@storybook/react-vite';
import type { StoreApi } from 'zustand';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import { useSelectionStore } from '@features/selection';

// Начальные состояния снимаем до первой истории: сторы — синглтоны модулей.
const snapshot = <T,>(store: StoreApi<T>) => {
  const initial = store.getState();
  return () => store.setState(initial, true);
};

const resets = [
  snapshot(useBuildingsStore),
  snapshot(useEconomyStore),
  snapshot(useGameLoopStore),
  snapshot(useMapStore),
  snapshot(useSettingsStore),
  snapshot(useUnitsStore),
  snapshot(useHighlightStore),
  snapshot(useMovementStore),
  snapshot(useSelectionStore),
];

const preview: Preview = {
  // Каждая история стартует с чистой игры и сама задаёт нужное состояние.
  beforeEach: () => resets.forEach(reset => reset()),
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
