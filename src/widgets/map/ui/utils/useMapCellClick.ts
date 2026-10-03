import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSettingsSelectors } from '@entities/settings';
import type { Scene } from '@widgets/map/lib';
import { useSelectionSelectors } from '@features/selection';
import { attack, heal, prepareStrike } from '@features/combat';
import { useGameLoopSelectors } from '@features/game-loop';
import { build } from '@features/build';
import { spawn } from '@features/spawn';
import { clearForest } from '@features/workers';
import {
  getRoutePreview,
  goTo,
  move,
  useHighlightSelectors,
  useMovementStore,
  useMovementSelectors,
} from '@features/pathfinding';
import type { CommandResult } from '@shared/config';
import { handleMapCellClick } from './mapClickHandler';
import { pushMapEffect } from './mapSignals';

/**
 * Отказ приказа по клетке: «×» над клеткой. Причину и звук отказа даёт
 * сообщение об ошибке из журнала — одинаково для карты и кнопок панели.
 */
const withRejectSignal =
  <T>(command: (input: T) => CommandResult, x: number, y: number) =>
  (input: T) => {
    const result = command(input);
    if (!result.ok) {
      pushMapEffect({ x, y, signal: 'reject', start: performance.now() });
    }
    return result;
  };

const getCommands = (x: number, y: number) => ({
  move: withRejectSignal(move, x, y),
  attack: withRejectSignal(attack, x, y),
  build: withRejectSignal(build, x, y),
  spawn: withRejectSignal(spawn, x, y),
  clearForest: withRejectSignal(clearForest, x, y),
  prepareStrike: withRejectSignal(prepareStrike, x, y),
  heal: withRejectSignal(heal, x, y),
  goTo: withRejectSignal(goTo, x, y),
});

const findAt = <T extends { x: number; y: number }>(
  entities: Record<string, T>,
  x: number,
  y: number,
) => Object.values(entities).find(entity => entity.x === x && entity.y === y);

/**
 * Возвращает обработчик клика по клетке: собирает текущий выбор, подсветку
 * и команды и передаёт их в {@link handleMapCellClick}.
 *
 * @param scene - Объекты, которые видит смотрящий: скрытого врага
 *   нельзя выбрать, снимок здания — не живая цель.
 * @returns Функция клика по клетке с координатами сетки.
 */
export const useMapCellClick = (scene: Scene) => {
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
    healTargets,
    calculateActionHighlights,
    resetStore: clearMovement,
  } = useMovementSelectors();
  const {
    spawnableCells,
    buildableCells,
    clearableCells,
    strikeCells,
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
        unit: findAt(scene.units, x, y) ?? null,
        building: findAt(scene.buildings, x, y) ?? null,
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
        clearable: clearableCells,
        strike: strikeCells,
        heal: healTargets,
        planned: useMovementStore.getState().plannedTarget,
      },
      commands: getCommands(x, y),
      ui: {
        selectUnit: unitsSelection.selectUnit,
        selectBuilding: buildingsSelection.selectBuilding,
        selectCell: terrainSelection.selectCell,
        calculateActionHighlights,
        clearSelection,
        clearMovement,
        clearHighlight,
        canPlanRoute: (unit, cellX, cellY) =>
          !!getRoutePreview(unit, humanId, { x: cellX, y: cellY }),
        setPlannedTarget: useMovementStore.getState().setPlannedTarget,
      },
    });
  };
};
