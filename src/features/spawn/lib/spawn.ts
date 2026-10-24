import {
  CAMP_HIRE_COST,
  UNITS_CONFIG,
  type CampSite,
  type Cost,
  type CommandResult,
  type ParticipantId,
  type Position,
  type ProductionBuilding,
  type UnitType,
} from '@shared/config';
import {
  canSpawnUnit,
  failure,
  getSightSources,
  isAdjacent,
  isBuildableTerrain,
  isCellVisible,
  ok,
  reject,
  getAvailableResources,
} from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useSitesStore } from '@entities/sites';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useMapStore } from '@entities/maps';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';
import { getDebugExceptions, getPayableResources } from '@entities/settings';

/** Приказ найма: здание или нейтральный лагерь, юнит и клетка появления. */
export type SpawnCommand = Position & {
  actor: ParticipantId;
  unitType: UnitType;
} & (
    | { buildingId: string; campId?: never }
    | { campId: string; buildingId?: never }
  );

const SPAWN_REJECTION = {
  resources: 'resources',
  population: 'population',
  spawnPoints: 'points',
} as const;

const validateAndSpawn = (
  command: SpawnCommand,
  isFree: boolean,
): CommandResult => {
  const { actor, unitType, x, y } = command;
  const turnRejection = getTurnRejection(actor);
  if (turnRejection) return reject(turnRejection);

  let building: ProductionBuilding | undefined;
  let camp: CampSite | undefined;
  let source: Position;
  let cost: Cost = UNITS_CONFIG[unitType]?.cost;
  let spawnPoints: number;
  const unitState = useUnitsStore.getState();
  if (command.campId !== undefined) {
    if (command.buildingId !== undefined) return reject('actionType');
    const site = useSitesStore.getState().sites[command.campId];
    if (!site) return reject('notFound');
    if (site.type !== 'camp') return reject('actionType');
    camp = site;
    cost = CAMP_HIRE_COST[unitType as keyof typeof CAMP_HIRE_COST];
    if (!cost) return reject('actionType');
    if (
      !Object.values(unitState.units).some(
        u => u.owner === actor && u.type === 'scout' && isAdjacent(u, site),
      )
    )
      return reject('scout');
    source = camp;
    spawnPoints = camp.hiresLeft;
  } else {
    const found = useBuildingsStore.getState().buildings[command.buildingId];
    if (!found) return reject('notFound');
    if (found.owner !== actor) return reject('owner');
    if (found.role !== 'production' || !found.spawningUnits.includes(unitType))
      return reject('actionType');
    building = found;
    source = building;
    spawnPoints = building.spawnPoints;
  }

  const cell = useMapStore.getState().getCell(x, y);
  if (!Number.isInteger(x) || !Number.isInteger(y) || !cell)
    return reject('bounds');
  const { grid } = useMapStore.getState();
  const viewers = [
    ...Object.values(unitState.units),
    ...Object.values(useBuildingsStore.getState().buildings),
  ];
  const sources = getSightSources(
    actor,
    viewers,
    grid,
    useGameLoopStore.getState().participants,
  );
  if (
    (camp && !isCellVisible(sources, camp.x, camp.y)) ||
    !isCellVisible(sources, x, y)
  )
    return reject('hidden');
  if (camp && camp.hiresLeft <= 0) return reject('campEmpty');
  if (!isBuildableTerrain('grass', cell.type)) return reject('terrain');
  if (!isAdjacent(source, { x, y })) return reject('distance');
  if (
    unitState.getUnitAt(x, y) ||
    useBuildingsStore.getState().getBuildingAt(x, y)
  )
    return reject('occupied');

  const { resources, populationCap, removeResources } =
    useEconomyStore.getState();
  const check = canSpawnUnit(
    unitType,
    getPayableResources(
      getAvailableResources(
        resources[actor],
        Object.values(unitState.units),
        actor,
      ),
      isFree,
    ),
    populationCap[actor],
    spawnPoints,
    cost,
  );
  if (!check.canSpawn)
    return reject(
      SPAWN_REJECTION[check.reason as keyof typeof SPAWN_REJECTION],
    );

  const unitId = unitState.spawnUnit(unitType, x, y, actor);
  if (!unitId) return failure(`Юнит ${unitType} не создан`);
  const target = building?.rallyPoint;
  if (target && (target.x !== x || target.y !== y)) {
    // Найм ещё держит runCommand busy: копируем цель без вложенной команды.
    useUnitsStore.getState().setOrder(unitId, { type: 'goto', ...target });
  }
  if (building) useBuildingsStore.getState().changeSpawnPoints(building.id);
  if (camp) useSitesStore.getState().consumeCampHire(camp.id);
  if (!isFree) removeResources(actor, cost);
  return ok;
};

/** Нанимает юнита из здания или лагеря; бесплатность отладки снимает только цену. */
export const spawn = (command: SpawnCommand) => {
  const isFree = getDebugExceptions(command.actor).includes('freeSpawn');
  return runCommand(
    {
      type: 'spawn',
      actor: command.actor,
      details: {
        ...(command.campId !== undefined
          ? { campId: command.campId }
          : { buildingId: command.buildingId }),
        unitType: command.unitType,
        x: command.x,
        y: command.y,
        ...(isFree ? { debug: 'freeSpawn' } : {}),
      },
    },
    useGameLoopStore.getState().currentTurn,
    () => validateAndSpawn(command, isFree),
  );
};
