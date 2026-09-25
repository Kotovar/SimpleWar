import type { ParticipantId } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';

// Подписка общая для всех партий и не должна дублироваться при повторном монтировании Game.
let initialized = false;

/** Видят действующий и пострадавший участники; повтор убирается. */
const between = (actor: ParticipantId, owner: ParticipantId) =>
  actor === owner ? [actor] : [actor, owner];

/**
 * Записывает в журнал последствия команд: гибель юнитов, разрушение зданий,
 * выбывание участника и конец партии. Подписываться после
 * `initGameLoopEvents`: выбывание к этому моменту уже применено.
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
        visibleTo: between(actor, event.owner),
        details: { owner: event.owner, unitType: type, x, y },
      });
    }

    if (event.type === 'BUILDING_DESTROYED') {
      const { type, x, y } = event.building;
      record({
        type: 'buildingDestroyed',
        actor,
        turn,
        visibleTo: between(actor, event.owner),
        details: { owner: event.owner, buildingType: type, x, y },
      });
    }

    if (event.type === 'BASE_DESTROYED') {
      // Записываем выбывание один раз и только если оно действительно применено.
      const alreadyRecorded = useJournalStore
        .getState()
        .entries.some(
          ({ type, details }) =>
            type === 'eliminated' && details?.participant === event.owner,
        );
      const { eliminated } = useGameLoopStore.getState();
      if (alreadyRecorded || !eliminated.includes(event.owner)) return;

      record({
        type: 'eliminated',
        actor: null,
        turn,
        visibleTo: 'all',
        details: { participant: event.owner },
      });

      const { phase, winner } = useGameLoopStore.getState();
      if (phase === 'gameOver') {
        record({
          type: 'gameOver',
          actor: null,
          turn,
          visibleTo: 'all',
          details: { winner: winner ?? 'none' },
        });
      }
    }
  });
};
