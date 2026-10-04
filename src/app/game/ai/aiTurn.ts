import {
  AI_YIELD_BREAK_MS,
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
import { attack, heal, prepareStrike } from '@features/combat';
import { build, demolish } from '@features/build';
import { spawn } from '@features/spawn';
import {
  assignWorker,
  clearForest,
  repair,
  unassignWorker,
} from '@features/workers';
import {
  playTurn,
  profileConfig,
  type AiAction,
  type AiTurnResult,
} from '@features/ai';
import { useSandboxStore } from '@features/sandbox';
import { startResearch } from '@features/research';
import { failure } from '@shared/lib';
import {
  getAiPresentationSnapshot,
  waitForAiPresentation,
} from './aiPresentation';

/**
 * Итог запуска хода ИИ. `stalled` — ход не перешёл дальше, хотя запуск не
 * отменён: сбой при завершении хода, партия стоит до решения игрока.
 */
export type AiRunResult = AiTurnResult & { stalled: boolean };

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
    case 'heal':
      return heal({ actor, ...action });
    case 'prepareStrike':
      return prepareStrike({ actor, ...action });
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
    case 'startResearch':
      return startResearch({ actor, research: action.research });
    case 'wait':
      return { ok: true };
  }
};

/** Сид решений ИИ: сид карты и слот участника, одинаковые для повтора. */
const seedFor = (actor: ParticipantId) =>
  ((useMapStore.getState().seed ?? 0) * 31 + PARTICIPANT_IDS.indexOf(actor)) >>>
  0;

/** Идущие ходы ИИ по ключу `партия:ход:участник`: один запуск на ход. */
const running = new Map<string, Promise<AiRunResult | null>>();

/** Сохранение ждёт завершения цикла: его новая память пока находится в Promise. */
export const waitForCurrentAi = () => {
  const prefix = `${useJournalStore.getState().gameId}:`;
  return Promise.all(
    [...running]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, promise]) => promise),
  );
};

const isSandboxPaused = () => {
  const sandbox = useSandboxStore.getState();
  return sandbox.enabled && sandbox.paused;
};

/**
 * Перерыв между порциями: в обычном режиме — на кадр отрисовки, в
 * ускоренном режиме тестирования — сразу следующей задачей.
 */
const nextTask = () => {
  const sandbox = useSandboxStore.getState();
  const delay = sandbox.enabled && sandbox.fast ? 0 : AI_YIELD_BREAK_MS;
  return new Promise<void>(resolve => setTimeout(resolve, delay));
};

/**
 * Ожидание снятия паузы режима тестирования. Сброс, конец партии или
 * смена хода тоже завершают ожидание — цикл хода затем видит отмену.
 */
const whilePaused = (isCancelled: () => boolean) => {
  if (!isSandboxPaused() || isCancelled()) return null;
  return new Promise<void>(resolve => {
    const check = () => {
      if (isSandboxPaused() && !isCancelled()) return;
      offs.forEach(off => off());
      resolve();
    };
    const offs = [
      useSandboxStore.subscribe(check),
      useGameLoopStore.subscribe(check),
      useJournalStore.subscribe(check),
    ];
  });
};

/**
 * Ход ИИ: планировщик получает только наблюдение стороны, действует общими
 * командами и завершает ход. Запуск привязан к партии и ходу: после сброса,
 * конца партии или смены хода он прекращается, не трогая чужой ход.
 * Повторный вызов для того же хода возвращает уже идущий запуск (его
 * опции не применяются); пауза режима тестирования приостанавливает его
 * между действиями.
 *
 * @param actor - Участник под управлением ИИ.
 * @param options.yieldControl - Пауза между порциями; в тестах — без задержек.
 * @param options.animate - Ждать видимых эффектов карты; интерфейс включает,
 * симуляции по умолчанию выполняются без визуальных пауз.
 */
export const runAITurn = (
  actor: ParticipantId,
  {
    yieldControl = nextTask,
    animate = false,
  }: {
    yieldControl?: () => Promise<void>;
    animate?: boolean;
  } = {},
) => {
  const gameId = useJournalStore.getState().gameId;
  const turn = useGameLoopStore.getState().currentTurn;
  const key = `${gameId}:${turn}:${actor}`;
  const existing = running.get(key);
  if (existing) return existing;

  const isCancelled = () => {
    const loop = useGameLoopStore.getState();
    return (
      useJournalStore.getState().gameId !== gameId ||
      loop.phase !== 'inProgress' ||
      loop.activePlayer !== actor ||
      loop.currentTurn !== turn
    );
  };
  if (isCancelled()) return Promise.resolve(null);

  const run = async (): Promise<AiRunResult> => {
    const memories = useAiMemoryStore.getState();
    const setup = useGameLoopStore
      .getState()
      .participants.find(({ id }) => id === actor)?.ai;
    const memory =
      memories.byParticipant[actor] ?? createAiMemory(seedFor(actor));
    let visibleChange = false;
    const result = await playTurn({
      config: profileConfig(setup?.profile),
      memory,
      observe: () => getObservation(actor),
      execute: action => {
        const before = animate ? getAiPresentationSnapshot() : '';
        const result = executeAiAction(actor, action);
        visibleChange = animate && before !== getAiPresentationSnapshot();
        return result;
      },
      afterCommand: animate
        ? () => (visibleChange ? waitForAiPresentation(isCancelled) : null)
        : undefined,
      isCancelled,
      waitWhilePaused: () => whilePaused(isCancelled),
      endTurn: () => nextTurn(actor),
      record: decision =>
        useJournalStore.getState().recordDecision({ ...decision, actor, turn }),
      yieldControl,
    }).catch((error: unknown): AiTurnResult => {
      if (useJournalStore.getState().gameId !== gameId) {
        return { memory, commands: 0, reason: 'отменено', cancelled: true };
      }
      // Сбой планировщика не держит партию: сбой — в журнал, ход передаётся.
      // Память остаётся прежней: решения упавшего хода не сохраняются.
      useJournalStore
        .getState()
        .reportError(
          { type: 'endTurn', actor },
          turn,
          failure(error instanceof Error ? error.message : String(error)),
        );
      if (!isCancelled()) nextTurn(actor);
      return {
        memory,
        commands: 0,
        reason: 'сбой планировщика',
        cancelled: false,
      };
    });
    // Память отменённого запуска не сохраняется в новую партию.
    if (useJournalStore.getState().gameId === gameId) {
      useAiMemoryStore.getState().setMemory(actor, result.memory);
    }
    return { ...result, stalled: !result.cancelled && !isCancelled() };
  };
  // Запуск регистрируется до начала хода: подписчик стора, вызванный
  // командой этого хода, получит тот же Promise, а не второй исполнитель.
  const promise = Promise.resolve()
    .then(run)
    .finally(() => running.delete(key));
  running.set(key, promise);
  return promise;
};
