import type { ParticipantId } from '@shared/config';
import { nextTurn } from '@features/game-loop';
import { getObservation, type Observation } from '@features/visibility';

/**
 * Решение ИИ по его наблюдению. Пока заглушка: ход завершается сразу.
 * ИИ получает только наблюдение, а не хранилища мира и не знания других.
 *
 * @param _observation - Наблюдение участника под управлением ИИ.
 * @returns Команды хода; сейчас только завершение.
 */
export const decideAITurn = (_observation: Observation) =>
  [{ type: 'endTurn' }] as const;

/**
 * Ход ИИ: решение по наблюдению и те же команды, что у человека.
 *
 * @param actor - Участник под управлением ИИ.
 */
export const runAITurn = (actor: ParticipantId) => {
  for (const command of decideAITurn(getObservation(actor))) {
    if (command.type === 'endTurn') nextTurn(actor);
  }
};
