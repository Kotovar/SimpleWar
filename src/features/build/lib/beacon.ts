import {
  BEACON_DURATION,
  BUILDINGS_CONFIG,
  type CommandResult,
  type ParticipantId,
  type Position,
  type Unit,
} from '@shared/config';
import {
  failure,
  getConcealedIds,
  getAvailableResources,
  getSightSources,
  isBuildableTerrain,
  isCellVisible,
  ok,
  reject,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSitesStore } from '@entities/sites';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { isPlacementBlocking } from './placementAccess';

export type LightBeaconCommand = Position & {
  actor: ParticipantId;
  unitId: string;
};

/** Место костра: видимая свободная равнина или холм в восьми соседних клетках. */
export const getBeaconPlacementRejection = (
  actor: ParticipantId,
  unit: Unit,
  { x, y }: Position,
) => {
  const { grid } = useMapStore.getState();
  const cell = grid[y]?.[x];
  if (!Number.isInteger(x) || !Number.isInteger(y) || !cell) return 'bounds';
  if (Math.max(Math.abs(unit.x - x), Math.abs(unit.y - y)) !== 1)
    return 'distance';
  const units = Object.values(useUnitsStore.getState().units);
  const buildings = Object.values(useBuildingsStore.getState().buildings);
  if (
    !isCellVisible(
      getSightSources(
        actor,
        [...units, ...buildings],
        grid,
        useGameLoopStore.getState().participants,
      ),
      x,
      y,
    )
  )
    return 'hidden';
  if (!isBuildableTerrain('grass', cell.type)) return 'terrain';
  const concealed = getConcealedIds(
    actor,
    units,
    buildings,
    useGameLoopStore.getState().participants,
  );
  if (
    [
      ...units.filter(u => !concealed.has(u.id)),
      ...buildings,
      ...Object.values(useSitesStore.getState().sites),
    ].some(e => e.x === x && e.y === y)
  )
    return 'occupied';
  if (isPlacementBlocking(actor, { x, y })) return 'blocked';
  return null;
};

/** Подсветка доступных мест костра; проверка совпадает с командой. */
export const getBeaconCells = (
  actor: ParticipantId,
  unit: Unit,
): Position[] => {
  const cells: Position[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cell = { x: unit.x + dx, y: unit.y + dy };
      if (!getBeaconPlacementRejection(actor, unit, cell)) cells.push(cell);
    }
  return cells;
};

const validateAndLight = ({
  actor,
  unitId,
  x,
  y,
}: LightBeaconCommand): CommandResult => {
  const turn = getTurnRejection(actor);
  if (turn) return reject(turn);
  const units = useUnitsStore.getState();
  const unit = units.units[unitId];
  if (!unit) return reject('notFound');
  if (unit.owner !== actor) return reject('owner');
  if (unit.type !== 'scout' || unit.role !== 'military')
    return reject('actionType');
  if (unit.attackPoints <= 0) return reject('points');
  const placement = getBeaconPlacementRejection(actor, unit, { x, y });
  if (placement) return reject(placement);
  // Предварительный выбор не выдаёт скрытого юнита, исполнение не допускает наложения.
  if (units.getUnitAt(x, y)) return reject('occupied');
  const economy = useEconomyStore.getState();
  const available = getAvailableResources(
    economy.resources[actor],
    Object.values(units.units),
    actor,
  );
  const { cost } = BUILDINGS_CONFIG.beacon;
  if (available.wood < cost.wood || available.gold < cost.gold)
    return reject('resources');
  if (
    !useBuildingsStore
      .getState()
      .spawnBuilding(
        'beacon',
        x,
        y,
        actor,
        useGameLoopStore.getState().currentTurn + BEACON_DURATION,
      )
  )
    return failure('Костёр не создан');
  economy.removeResources(actor, cost);
  units.changeAttackPoints(unitId);
  return ok;
};

/** Разжигает костёр за ресурсы и боевое действие разведчика. */
export const lightBeacon = (command: LightBeaconCommand) =>
  runCommand(
    {
      type: 'lightBeacon',
      actor: command.actor,
      details: { unitId: command.unitId, x: command.x, y: command.y },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndLight(command),
  );
