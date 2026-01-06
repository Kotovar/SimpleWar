import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Unit, useUnitsStore } from '@entities/units';
import { Building, useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import type { Cell } from '@shared/config';
import type { Selection } from '@features/selection';

interface SelectionState {
  selection: Selection | null;

  selectCell: (x: number, y: number) => void;
  selectUnit: (id: string) => void;
  selectBuilding: (id: string) => void;

  getSelectedCell: () => Cell | null;
  getSelectedUnit: () => Unit | null;
  getSelectedBuilding: () => Building | null;

  clearSelection: () => void;

  isClickOnCurrentSelection: (x: number, y: number) => boolean;
}

export const useSelectionStore = create<SelectionState>()(
  immer((set, get) => ({
    selection: null,

    selectCell: (x, y) => set({ selection: { kind: 'cell', x, y } }),
    selectUnit: id => set({ selection: { kind: 'unit', id } }),
    selectBuilding: id => set({ selection: { kind: 'building', id } }),

    getSelectedCell: () => {
      const selection = get().selection;
      return selection?.kind === 'cell'
        ? useMapStore.getState().getCell(selection.x, selection.y)
        : null;
    },

    getSelectedUnit: () => {
      const selection = get().selection;
      return selection?.kind === 'unit'
        ? useUnitsStore.getState().units[selection?.id]
        : null;
    },

    getSelectedBuilding: () => {
      const selection = get().selection;
      return selection?.kind === 'building'
        ? useBuildingsStore.getState().buildings[selection?.id]
        : null;
    },

    clearSelection: () => set({ selection: null }),

    isClickOnCurrentSelection: (x: number, y: number) => {
      const selection = get().selection;
      if (!selection) return false;

      switch (selection.kind) {
        case 'cell': {
          const cell = useMapStore.getState().getCell(x, y);
          return cell?.x === selection.x && cell.y === selection.y;
        }

        case 'unit': {
          const unit = useUnitsStore.getState().getUnitAt(x, y);
          return unit?.id === selection.id;
        }

        case 'building': {
          const building = useBuildingsStore.getState().getBuildingAt(x, y);
          return building?.id === selection.id;
        }
      }
    },
  })),
);
