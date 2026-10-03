import type { ParticipantId, Position } from '@shared/config';
import { getSightSources, isCellVisible, ok, reject } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { getParticipantKnowledge } from '@entities/perceptions';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { runCommand } from '@entities/journals';

/** Точка для будущих новобранцев; null снимает её. */
export type RallyPointCommand = {
  actor: ParticipantId;
  buildingId: string;
  target: Position | null;
};

/** Меняет только намерение здания, не приказы уже нанятых юнитов и не их очки. */
export const setRallyPoint = ({
  actor,
  buildingId,
  target,
}: RallyPointCommand) =>
  runCommand(
    {
      type: 'order',
      actor,
      details: { buildingId, rally: 1, ...(target ?? { cancel: 1 }) },
    },
    useGameLoopStore.getState().currentTurn,
    () => {
      const turnRejection = getTurnRejection(actor);
      if (turnRejection) return reject(turnRejection);
      const buildings = useBuildingsStore.getState();
      const building = buildings.buildings[buildingId];
      if (!building) return reject('notFound');
      if (building.owner !== actor) return reject('owner');
      if (building.role !== 'production') return reject('actionType');
      if (!target) {
        buildings.setRallyPoint(buildingId, null);
        return ok;
      }
      const { x, y } = target;
      const { grid, getCell } = useMapStore.getState();
      if (!Number.isInteger(x) || !Number.isInteger(y) || !getCell(x, y))
        return reject('bounds');
      const units = useUnitsStore.getState();
      const visible = isCellVisible(
        getSightSources(
          actor,
          [
            ...Object.values(units.units),
            ...Object.values(buildings.buildings),
          ],
          grid,
        ),
        x,
        y,
      );
      // Скрытая занятость не участвует в ответе команды.
      const rememberedBuilding = Object.values(
        getParticipantKnowledge(actor)?.contacts ?? {},
      ).some(
        contact =>
          contact.kind === 'building' && contact.x === x && contact.y === y,
      );
      if (
        visible
          ? !!(units.getUnitAt(x, y) || buildings.getBuildingAt(x, y))
          : rememberedBuilding
      )
        return reject('occupied');
      buildings.setRallyPoint(buildingId, target);
      return ok;
    },
  );
