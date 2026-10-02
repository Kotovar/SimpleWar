import type { ResearchType } from '@shared/config';
import { isAdjacent } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useResearchStore } from '@entities/researches';
import { getPayableResources, useDebugException } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useGameLoopSelectors } from '@features/game-loop';
import { useHighlightStore } from '@features/pathfinding';
import { useSelectionStore } from '@features/selection';
import {
  getSelectionActions,
  type ActionButton,
  type SelectionActionInput,
} from '../lib/selectionActions';
import { getModePrompt, type MapMode } from '../lib/modePrompt';
import { runSelectionAction } from './runSelectionAction';

const EMPTY: readonly ResearchType[] = [];

/**
 * Кнопки нижней панели для своего выбранного объекта: собирает сведения
 * из хранилищ и строит кнопки чистой функцией; исполнение — тем же
 * путём, что у карты и ИИ.
 *
 * @returns Кнопки, `run` — выполнить кнопку (подменю не открывает) и
 *   ключ выбранного для сброса подменю.
 */
export const useSelectionActions = () => {
  const { humanId } = useGameLoopSelectors();
  const selection = useSelectionStore(state => state.selection);
  const units = useUnitsStore(state => state.units);
  const buildings = useBuildingsStore(state => state.buildings);
  const owner = humanId ?? 'p1';
  const isTurn = useGameLoopStore(state => state.activePlayer === humanId);
  const resources = useEconomyStore(state => state.resources[owner]);
  const population = useEconomyStore(state => state.populationCap[owner]);
  const researched = useResearchStore(state => state.completed[owner] ?? EMPTY);
  const researching = useResearchStore(
    state => state.current[owner]?.type ?? null,
  );
  const freeBuild = useDebugException(owner, 'freeBuild');
  const freeSpawn = useDebugException(owner, 'freeSpawn');
  const highlight = useHighlightStore();
  const modeBuilding = useBuildingsStore(
    state => state.selectedBuildingForSpawn,
  );
  const modeUnit = useUnitsStore(state => state.selectedUnitForSpawn);

  const selectedUnit =
    selection?.kind === 'unit' ? (units[selection.id] ?? null) : null;
  const selectedBuilding =
    selection?.kind === 'building' ? (buildings[selection.id] ?? null) : null;
  const unit = selectedUnit?.owner === humanId ? selectedUnit : null;
  const building =
    selectedBuilding?.owner === humanId ? selectedBuilding : null;

  const own = Object.values(buildings).filter(b => b.owner === humanId);
  const workers = Object.values(units).filter(u => u.role === 'civil');
  const input: SelectionActionInput = {
    unit,
    building,
    isTurn,
    payableBuild: getPayableResources(resources, freeBuild),
    payableSpawn: getPayableResources(resources, freeSpawn),
    stock: resources,
    population,
    researched,
    researching,
    // Рабочий внутри здания работает и с самим зданием.
    nearby: unit
      ? own.filter(
          b => isAdjacent(unit, b) || (b.x === unit.x && b.y === unit.y),
        )
      : [],
    takenWorkplaces: new Set(
      workers.flatMap(w =>
        w.role === 'civil' && w.id !== unit?.id && w.workplaceId
          ? [w.workplaceId]
          : [],
      ),
    ),
    workerInside: building
      ? (workers.find(
          w => w.role === 'civil' && w.workplaceId === building.id,
        ) ?? null)
      : null,
    mode: {
      building: modeBuilding,
      unit: modeUnit,
      clearing: !!highlight.clearableCells,
      striking: !!highlight.strikeCells,
    },
  };
  const buttons = humanId ? getSelectionActions(input) : [];

  const run = (button: ActionButton) =>
    runSelectionAction(button, { humanId, unit, building, input });

  // Подсказка следующего шага во включённом режиме карты.
  const mapMode: MapMode | null = modeBuilding
    ? {
        kind: 'build',
        type: modeBuilding,
        cells: highlight.buildableCells?.length ?? 0,
      }
    : modeUnit
      ? {
          kind: 'spawn',
          type: modeUnit,
          cells: highlight.spawnableCells?.length ?? 0,
        }
      : highlight.clearableCells
        ? { kind: 'clear', cells: highlight.clearableCells.length }
        : highlight.strikeCells
          ? { kind: 'strike', cells: highlight.strikeCells.length }
          : null;
  const prompt = mapMode && (unit || building) ? getModePrompt(mapMode) : null;

  return {
    buttons,
    run,
    prompt,
    selectionKey: unit?.id ?? building?.id ?? null,
  };
};
