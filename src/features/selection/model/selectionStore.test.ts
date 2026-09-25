import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useSelectionStore } from './selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    useSelectionStore.getState().resetStore();
    useUnitsStore.getState().resetStore();
    useBuildingsStore.getState().resetStore();
  });

  it('возвращает null для удалённого выбранного юнита', () => {
    const selection = useSelectionStore.getState();
    selection.selectUnit('missing');

    expect(selection.getSelectedUnit()).toBeNull();
  });

  it('возвращает null для удалённого выбранного здания', () => {
    const selection = useSelectionStore.getState();
    selection.selectBuilding('missing');

    expect(selection.getSelectedBuilding()).toBeNull();
  });

  it('сбрасывает выделение вместе с режимами стройки и найма', () => {
    useSelectionStore.getState().selectCell(1, 1);
    useUnitsStore.getState().selectUnitForSpawn('worker');
    useBuildingsStore.getState().selectBuildingForSpawn('farm');

    useSelectionStore.getState().resetStore();

    expect(useSelectionStore.getState().selection).toBeNull();
    expect(useUnitsStore.getState().selectedUnitForSpawn).toBeNull();
    expect(useBuildingsStore.getState().selectedBuildingForSpawn).toBeNull();
  });
});
