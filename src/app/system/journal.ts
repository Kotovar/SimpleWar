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
    const {
      activePlayer: actor,
      currentTurn: turn,
      participants,
      eliminated,
    } = useGameLoopStore.getState();
    const { record } = useJournalStore.getState();

    if (event.type === 'ATTACK_LANDED') {
      const { owner, type, x, y, hp } = event.target;
      const sheltered =
        'movePoints' in event.target &&
        !!useBuildingsStore.getState().getBuildingAt(x, y);
      const width = useMapStore.getState().grid[0]?.length ?? 0;
      const viewers = participants
        .filter(
          ({ id }) =>
            id === owner ||
            (!sheltered &&
              !eliminated.includes(id) &&
              computeVisibleMask(id)[y * width + x] === 1),
        )
        .map(({ id }) => id);
      record({
        type: 'attackObserved',
        actor: null,
        turn,
        visibleTo: viewers,
        // Место и полученный урон известны владельцу; стрелявший может быть скрыт.
        details: {
          owner,
          targetType: type,
          x,
          y,
          damage: Math.min(hp, event.damage),
        },
      });
    }

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
        details: {
          owner: event.owner,
          buildingType: type,
          x,
          y,
          ...(event.demolished ? { demolished: 1 } : {}),
        },
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
