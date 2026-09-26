import type { ParticipantId } from '@shared/config';
import { nextTurn } from '@features/game-loop';

/**
 * Ход ИИ: пока заглушка, которая завершает ход той же командой, что и человек.
 *
 * @param actor - Участник под управлением ИИ.
 */
export const runAITurn = (actor: ParticipantId) => {
  nextTurn(actor);
};
