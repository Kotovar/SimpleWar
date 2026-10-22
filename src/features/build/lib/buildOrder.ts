import {
  BUILDINGS_CONFIG,
  type BuildingType,
  type CellType,
  type ParticipantId,
  type Position,
  type RejectionCode,
  type Unit,
} from '@shared/config';
import {
  getAvailableResources,
  getSightSources,
  isCellVisible,
  isBuildableTerrain,
  isBuildingUnlocked,
  ok,
  reject,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import {
  getParticipantKnowledge,
  getKnownCellType,
} from '@entities/perceptions';
import { useResearchStore } from '@entities/researches';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { useEconomyStore } from '@entities/economies';
import { getDebugExceptions, getPayableResources } from '@entities/settings';
import { isPlacementBlocking } from './placementAccess';
import type { BuildCommand } from './build';

type Placement = (x: number, y: number) => CellType | null;

/**
 * Проверка клетки по знаниям участника: известная местность без видимого
 * объекта и без известного здания. Обзор и знания считаются один раз —
 * так дешево проверить всю карту.
 */
const createKnownPlacement = (actor: ParticipantId): Placement => {
  const { grid } = useMapStore.getState();
  const units = Object.values(useUnitsStore.getState().units);
  const buildings = Object.values(useBuildingsStore.getState().buildings);
  const sources = getSightSources(
    actor,
    [...units, ...buildings],
    grid,
    useGameLoopStore.getState().participants,
  );
  const knowledge = getParticipantKnowledge(actor);
  const key = (x: number, y: number) => `${x},${y}`;
  const occupied = new Set([...units, ...buildings].map(e => key(e.x, e.y)));
  // Скрытая занятость не раскрывается: вне обзора — только известные здания.
  const remembered = new Set(
    Object.values(knowledge?.contacts ?? {})
      .filter(contact => contact.kind === 'building')
      .map(contact => key(contact.x, contact.y)),
  );
  return (x, y) => {
    const cell = grid[y]?.[x];
    if (!cell) return null;
    const visible = isCellVisible(sources, x, y);
    const type = visible ? cell.type : getKnownCellType(knowledge, x, y);
    if (!type) return null;
    return (visible ? occupied : remembered).has(key(x, y)) ? null : type;
  };
};

const canWorkerBuild = (
  worker: Unit,
  actor: ParticipantId,
  buildingType: BuildingType,
) =>
  worker.owner === actor &&
  worker.role === 'civil' &&
  worker.canBuild &&
  worker.buildableBuildings.includes(buildingType) &&
  isBuildingUnlocked(
    buildingType,
    useResearchStore.getState().completed[actor],
  );

/** Доступные здания по известной местности; скрытая занятость не раскрывается. */
export const getContextBuildings = (
  worker: Unit,
  actor: ParticipantId,
  target: Position,
): BuildingType[] => {
  if (worker.role !== 'civil') return [];
  const type = createKnownPlacement(actor)(target.x, target.y);
  if (type !== 'gold' && type !== 'forest') return [];
  return worker.buildableBuildings.filter(
    buildingType =>
      canWorkerBuild(worker, actor, buildingType) &&
      isBuildableTerrain(BUILDINGS_CONFIG[buildingType].requiredField, type),
  );
};

/**
 * Почему здание нельзя заложить на клетке по знаниям участника; `null` —
 * можно. Путь рабочего и ресурсы не проверяются: это делают приказ и стройка.
 *
 * @param placement - Готовая проверка клетки, чтобы не считать обзор заново.
 */
export const getPlacementRejection = (
  worker: Unit,
  actor: ParticipantId,
  buildingType: BuildingType,
  target: Position,
  placement: Placement = createKnownPlacement(actor),
): RejectionCode | null => {
  if (!canWorkerBuild(worker, actor, buildingType)) return 'actionType';
  const type = placement(target.x, target.y);
  if (!type) return 'occupied';
  // Без требования здание ставится на равнину (или холм).
  const required = BUILDINGS_CONFIG[buildingType].requiredField ?? 'grass';
  if (!isBuildableTerrain(required, type)) return 'terrain';
  // Лес и золото непроходимы — их здание прохода не перекроет.
  if (required === 'grass' && isPlacementBlocking(actor, target))
    return 'blocked';
  return null;
};

/**
 * Клетки карты с подходящей известной местностью без известного объекта.
 * Проход и путь не проверяются: разметка прохода на каждую клетку
 * слишком дорога, её делает {@link getPlacementRejection} для одной клетки.
 *
 * @returns Кандидаты по всей карте.
 */
export const getBuildPlacements = (
  worker: Unit,
  actor: ParticipantId,
  buildingType: BuildingType,
): Position[] => {
  if (!canWorkerBuild(worker, actor, buildingType)) return [];
  const { grid } = useMapStore.getState();
  const placement = createKnownPlacement(actor);
  const { requiredField } = BUILDINGS_CONFIG[buildingType];
  const result: Position[] = [];
  grid.forEach((row, y) =>
    row.forEach((_, x) => {
      const type = placement(x, y);
      if (type && isBuildableTerrain(requiredField, type))
        result.push({ x, y });
    }),
  );
  return result;
};

/**
 * Ставит приказ «идти и построить» и резервирует цену здания (см.
 * `getReservedResources`): клетка может быть далеко, рабочий дойдёт сам.
 * Снятый, заменённый или остановленный приказ возвращает резерв.
 */
export const giveBuildOrder = ({
  actor,
  workerId,
  buildingType,
  x,
  y,
}: BuildCommand) =>
  runCommand(
    { type: 'order', actor, details: { unitId: workerId, buildingType, x, y } },
    useGameLoopStore.getState().currentTurn,
    () => {
      const turn = getTurnRejection(actor);
      if (turn) return reject(turn);
      const worker = useUnitsStore.getState().units[workerId];
      if (!worker) return reject('notFound');
      if (worker.owner !== actor) return reject('owner');
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        !useMapStore.getState().getCell(x, y)
      )
        return reject('bounds');
      const placement = getPlacementRejection(worker, actor, buildingType, {
        x,
        y,
      });
      if (placement) return reject(placement);
      // Ресурсы резервируются сразу: прежний приказ этого рабочего заменяется.
      const isFree = getDebugExceptions(actor).includes('freeBuild');
      const available = getPayableResources(
        getAvailableResources(
          useEconomyStore.getState().resources[actor],
          Object.values(useUnitsStore.getState().units),
          actor,
          workerId,
        ),
        isFree,
      );
      const { cost } = BUILDINGS_CONFIG[buildingType];
      if (available.gold < cost.gold || available.wood < cost.wood)
        return reject('resources');
      useUnitsStore.getState().setOrder(workerId, {
        type: 'build',
        buildingType,
        x,
        y,
        ...(isFree ? { free: true as const } : {}),
      });
      return ok;
    },
  );
