import type {
  CommandResult,
  ParticipantId,
  Position,
  Unit,
} from '@shared/config';
import {
  failure,
  getConcealedIds,
  getSightSources,
  isAdjacent,
  isCellVisible,
  ok,
  reject,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSitesStore } from '@entities/sites';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { isPlacementBlocking } from './placementAccess';

export type OccupyRuinsCommand = Position & {
  actor: ParticipantId;
  unitId: string;
};

/** Руины для захвата: соседние, видимые и свободные по знаниям участника. */
export const getOutpostPlacementRejection = (
  actor: ParticipantId,
  unit: Unit,
  { x, y }: Position,
) => {
  const { grid } = useMapStore.getState();
  if (!Number.isInteger(x) || !Number.isInteger(y) || !grid[y]?.[x])
    return 'bounds';
  if (!isAdjacent(unit, { x, y })) return 'distance';
  const units = Object.values(useUnitsStore.getState().units);
  const buildings = Object.values(useBuildingsStore.getState().buildings);
  const { participants } = useGameLoopStore.getState();
  if (
    !isCellVisible(
      getSightSources(actor, [...units, ...buildings], grid, participants),
      x,
      y,
    )
  )
    return 'hidden';
  if (useSitesStore.getState().getSiteAt(x, y)?.type !== 'ruins')
    return 'target';
  const concealed = getConcealedIds(actor, units, buildings, participants);
  if (
    [...units.filter(u => !concealed.has(u.id)), ...buildings].some(
      e => e.x === x && e.y === y,
    )
  )
    return 'occupied';
  if (isPlacementBlocking(actor, { x, y })) return 'blocked';
  return null;
};

/** Подсветка соседних руин для выбранного бойца. */
export const getOutpostCells = (actor: ParticipantId, unit: Unit): Position[] =>
  Object.values(useSitesStore.getState().sites)
    .filter(
      site =>
        site.type === 'ruins' &&
        !getOutpostPlacementRejection(actor, unit, site),
    )
    .map(({ x, y }) => ({ x, y }));

const validateAndOccupy = ({
  actor,
  unitId,
  x,
  y,
}: OccupyRuinsCommand): CommandResult => {
  const turn = getTurnRejection(actor);
  if (turn) return reject(turn);
  const units = useUnitsStore.getState();
  const unit = units.units[unitId];
  if (!unit) return reject('notFound');
  if (unit.owner !== actor) return reject('owner');
  if (unit.role !== 'military') return reject('actionType');
  if (unit.attackPoints <= 0) return reject('points');
  const placement = getOutpostPlacementRejection(actor, unit, { x, y });
  if (placement) return reject(placement);
  // Предварительный выбор не выдаёт маскировку; реальное наложение запрещено.
  if (units.getUnitAt(x, y)) return reject('occupied');
  const site = useSitesStore.getState().getSiteAt(x, y)!;
  if (!useBuildingsStore.getState().spawnBuilding('outpost', x, y, actor))
    return failure('Аванпост не создан');
  useSitesStore.getState().removeSite(site.id);
  units.changeAttackPoints(unitId);
  return ok;
};

/** Занимает нейтральные руины за одно боевое действие, без ресурсов. */
export const occupyRuins = (command: OccupyRuinsCommand) =>
  runCommand(
    {
      type: 'occupyRuins',
      actor: command.actor,
      details: { unitId: command.unitId, x: command.x, y: command.y },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndOccupy(command),
  );
