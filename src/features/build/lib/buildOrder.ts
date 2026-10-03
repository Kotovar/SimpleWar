import {
  BUILDINGS_CONFIG,
  type BuildingType,
  type ParticipantId,
  type Position,
  type Unit,
} from '@shared/config';
import {
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
import type { BuildCommand } from './build';

/** Доступные здания по известной местности; скрытая занятость не раскрывается. */
export const getContextBuildings = (
  worker: Unit,
  actor: ParticipantId,
  target: Position,
): BuildingType[] => {
  if (worker.owner !== actor || worker.role !== 'civil' || !worker.canBuild)
    return [];
  const cell = useMapStore.getState().getCell(target.x, target.y);
  if (!cell) return [];
  const units = useUnitsStore.getState();
  const buildings = useBuildingsStore.getState();
  const visible = isCellVisible(
    getSightSources(
      actor,
      [...Object.values(units.units), ...Object.values(buildings.buildings)],
      useMapStore.getState().grid,
    ),
    target.x,
    target.y,
  );
  const knowledge = getParticipantKnowledge(actor);
  const type = visible
    ? cell.type
    : getKnownCellType(knowledge, target.x, target.y);
  if (!type) return [];
  if (
    visible
      ? units.getUnitAt(target.x, target.y) ||
        buildings.getBuildingAt(target.x, target.y)
      : Object.values(knowledge?.contacts ?? {}).some(
          c => c.kind === 'building' && c.x === target.x && c.y === target.y,
        )
  )
    return [];
  if (type !== 'gold' && type !== 'forest') return [];
  return worker.buildableBuildings.filter(
    buildingType =>
      isBuildableTerrain(BUILDINGS_CONFIG[buildingType].requiredField, type) &&
      isBuildingUnlocked(
        buildingType,
        useResearchStore.getState().completed[actor],
      ),
  );
};

/** Сохраняет стройку без списания ресурсов: обычная build проверит их по прибытии. */
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
      if (!getContextBuildings(worker, actor, { x, y }).includes(buildingType))
        return reject('target');
      useUnitsStore
        .getState()
        .setOrder(workerId, { type: 'build', buildingType, x, y });
      return ok;
    },
  );
