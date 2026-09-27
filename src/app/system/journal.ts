import type { ParticipantId } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useMapStore } from '@entities/maps';
import { useBuildingsStore } from '@entities/buildings';
import { computeVisibleMask } from '@features/visibility';

// Подписка общая для всех партий и не должна дублироваться при повторном монтировании Game.
let initialized = false;

/** Владелец знает о потере; действующий — только если видит её. */
const between = (
  actor: ParticipantId,
  entity: { owner: ParticipantId; x: number; y: number },
  sheltered = false,
) => {
  const { owner, x, y } = entity;
  if (actor === owner || sheltered) return [owner];
  const width = useMapStore.getState().grid[0]?.length ?? 0;
  return computeVisibleMask(actor)[y * width + x] === 1
    ? [actor, owner]
    : [owner];
};

/**
 * Записывает в журнал последствия команд: гибель юнитов, разрушение зданий,
 * выбывание участника и конец партии. Выбывание приходит уже применённым
 * и ровно один раз (`PARTICIPANT_ELIMINATED`), порядок подписок не важен.
 */
export const initJournalSystem = () => {
  if (initialized) return;
  initialized = true;

  gameEvents.subscribe(event => {
    const { activePlayer: actor, currentTurn: turn } =
      useGameLoopStore.getState();
    const { record } = useJournalStore.getState();

    if (event.type === 'UNIT_DESTROYED') {
      const { type, x, y } = event.unit;
      record({
        type: 'unitDestroyed',
        actor,
        turn,
        visibleTo: between(
          actor,
          event.unit,
          !!useBuildingsStore.getState().getBuildingAt(x, y),
        ),
        details: { owner: event.owner, unitType: type, x, y },
      });
    }

    if (event.type === 'BUILDING_DESTROYED') {
      const { type, x, y } = event.building;
      record({
        type: 'buildingDestroyed',
        actor,
        turn,
        visibleTo: between(actor, event.building),
        details: { owner: event.owner, buildingType: type, x, y },
      });
    }

    if (event.type === 'PARTICIPANT_ELIMINATED') {
      record({
        type: 'eliminated',
        actor: null,
        turn: event.turn,
        visibleTo: 'all',
        details: { participant: event.owner },
      });

      const { phase, winner } = useGameLoopStore.getState();
      if (phase === 'gameOver') {
        record({
          type: 'gameOver',
          actor: null,
          turn: event.turn,
          visibleTo: 'all',
          details: { winner: winner ?? 'none' },
        });
      }
    }
  });
};
