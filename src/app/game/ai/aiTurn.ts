import {
  PARTICIPANT_IDS,
  type CommandResult,
  type ParticipantId,
} from '@shared/config';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { createAiMemory, useAiMemoryStore } from '@entities/ai-memories';
import { nextTurn } from '@features/game-loop';
import { getObservation } from '@features/visibility';
import { move } from '@features/pathfinding';
import { attack } from '@features/combat';
import { build, demolish } from '@features/build';
import { spawn } from '@features/spawn';
import {
  assignWorker,
  clearForest,
  repair,
  unassignWorker,
} from '@features/workers';
import { playTurn, type AiAction } from '@features/ai';

/**
 * Исполняет действие ИИ теми же командами, что и интерфейс человека.
 * Законность проверяет команда по полному миру; ИИ её не видит.
 *
 * @param actor - Участник под управлением ИИ.
 * @param action - Действие, выбранное планировщиком.
 */
export const executeAiAction = (
  actor: ParticipantId,
  action: AiAction,
): CommandResult => {
  switch (action.type) {
    case 'move':
      return move({ actor, ...action });
    case 'attack':
      return attack({ actor, ...action });
    case 'build':
      return build({ actor, ...action });
    case 'spawn':
      return spawn({ actor, ...action });
    case 'assign':
      return assignWorker({ actor, ...action });
    case 'unassign':
      return unassignWorker({ actor, ...action });
    case 'repair':
      return repair({ actor, ...action });
    case 'clearForest':
      return clearForest({ actor, ...action });
    case 'demolish':
      return demolish({ actor, ...action });
    case 'wait':
      return { ok: true };
  }
};

/** Сид решений ИИ: сид карты и слот участника, одинаковые для повтора. */
const seedFor = (actor: ParticipantId) =>
  ((useMapStore.getState().seed ?? 0) * 31 + PARTICIPANT_IDS.indexOf(actor)) >>>
  0;

/** Отдать управление браузеру между порциями работы ИИ. */
const nextTask = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Ход ИИ: планировщик получает только наблюдение стороны, действует общими
 * командами и завершает ход. Запуск привязан к партии и ходу: после сброса,
 * конца партии или смены хода он прекращается, не трогая чужой ход.
 *
 * @param actor - Участник под управлением ИИ.
 * @param options.yieldControl - Пауза между порциями; в тестах — без задержек.
 */
export const runAITurn = async (
  actor: ParticipantId,
  { yieldControl = nextTask }: { yieldControl?: () => Promise<void> } = {},
) => {
  const gameId = useJournalStore.getState().gameId;
  const turn = useGameLoopStore.getState().currentTurn;
  const isCancelled = () => {
    const loop = useGameLoopStore.getState();
    return (
      useJournalStore.getState().gameId !== gameId ||
      loop.phase !== 'inProgress' ||
      loop.activePlayer !== actor ||
      loop.currentTurn !== turn
    );
  };
  if (isCancelled()) return null;

  const memories = useAiMemoryStore.getState();
  const result = await playTurn({
    memory: memories.byParticipant[actor] ?? createAiMemory(seedFor(actor)),
    observe: () => getObservation(actor),
    execute: action => executeAiAction(actor, action),
    isCancelled,
    endTurn: () => nextTurn(actor),
    record: decision =>
      useJournalStore.getState().recordDecision({ ...decision, actor, turn }),
    yieldControl,
  });

  // Память отменённого запуска не сохраняется в новую партию.
  if (useJournalStore.getState().gameId === gameId) {
    useAiMemoryStore.getState().setMemory(actor, result.memory);
  }
  return result;
};
