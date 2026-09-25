import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSettingsSelectors } from '@entities/settings';
import { useSelectionSelectors } from '@features/selection';
import { attack } from '@features/combat';
import { useGameLoopSelectors } from '@features/game-loop';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import {
  move,
  useHighlightSelectors,
  useMovementSelectors,
} from '@features/pathfinding';
import { handleMapCellClick } from './mapClickHandler';

const commands = { move, attack, build, spawn };

/**
 * Возвращает обработчик клика по клетке: собирает текущий выбор, подсветку
 * и команды и передаёт их в {@link handleMapCellClick}.
 *
 * @returns Функция клика по клетке с координатами сетки.
 */
export const useMapCellClick = () => {
  const { humanId } = useGameLoopSelectors();
  const { gridColumns, gridRows } = useSettingsSelectors();
  const {
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
    isClickOnCurrentSelection,
  } = useSelectionSelectors();
  const {
    reachableCells,
    attackableTargets,
    calculateActionHighlights,
    resetStore: clearMovement,
  } = useMovementSelectors();
  const {
    spawnableCells,
    buildableCells,
    resetStore: clearHighlight,
  } = useHighlightSelectors();

  return (x: number, y: number) => {
    if (!humanId) return;
    if (x < 0 || x >= gridColumns || y < 0 || y >= gridRows) return;

    const units = useUnitsStore.getState();
    const buildings = useBuildingsStore.getState();

    handleMapCellClick(x, y, {
      humanId,
      clicked: {
        unit: units.getUnitAt(x, y),
        building: buildings.getBuildingAt(x, y),
      },
      selection: {
        unit: unitsSelection.getSelectedUnit(),
        building: buildingsSelection.getSelectedBuilding(),
        buildingTypeToPlace: buildings.selectedBuildingForSpawn,
        unitTypeToSpawn: units.selectedUnitForSpawn,
        isCurrent: isClickOnCurrentSelection,
      },
      highlights: {
        reachable: reachableCells,
        attackable: attackableTargets,
        buildable: buildableCells,
        spawnable: spawnableCells,
      },
      commands,
      ui: {
        selectUnit: unitsSelection.selectUnit,
        selectBuilding: buildingsSelection.selectBuilding,
        selectCell: terrainSelection.selectCell,
        calculateActionHighlights,
        clearSelection,
        clearMovement,
        clearHighlight,
      },
    });
  };
};
