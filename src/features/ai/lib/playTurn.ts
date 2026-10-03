import {
  AI_CONFIG,
  AI_PROFILES,
  STRATEGY_NAME,
  type CommandResult,
} from '@shared/config';
import type { AiMemory } from '@entities/ai-memories';
import type { AiDecisionInput } from '@entities/journals';
import type { Observation } from '@entities/perceptions';
import type { AiAction, AiRule, Candidate } from '../model/types';
import { buildContext } from './context';
import { describe } from './describeAction';
import { actionKey, decideStep } from './decide';
import { applyOutcome, createTurnState, refreshMemory } from './memory';
import { AI_RULES } from './rules';

/** Всё, что цикл хода получает снаружи: так он не читает хранилища мира. */
export type AiTurnDeps = {
  /** Свежее наблюдение стороны после каждой команды. */
  observe: () => Observation;
  /** Выполняет действие общей командой S02 от имени стороны. */
  execute: (action: AiAction) => CommandResult;
  /** Запуск устарел: партию сбросили, закончили или ход сменился. */
  isCancelled: () => boolean;
  /** Завершает ход той же командой, что у человека. */
  endTurn: () => void;
  /** Запись решения в журнал разработчика; не влияет на выбор. */
  record?: (decision: Omit<AiDecisionInput, 'actor' | 'turn'>) => void;
  /** Отдаёт управление браузеру между порциями работы. */
  yieldControl?: () => Promise<void>;
  /** Необязательное ожидание визуального отклика после успешной команды. */
  afterCommand?: () => Promise<void> | null;
  /**
   * Пауза перед очередным шагом: Promise, пока ход приостановлен, иначе
   * `null`. Состояние хода и память сохраняются, продолжение — тот же цикл.
   */
  waitWhilePaused?: () => Promise<void> | null;
  /** Часы для бюджета порции; в тестах подменяются. */
  now?: () => number;
  memory: AiMemory;
  rules?: AiRule[];
  config?: typeof AI_CONFIG;
};

/** Итог хода ИИ. */
export type AiTurnResult = {
  memory: AiMemory;
  commands: number;
  /** Почему ход завершён. */
  reason: string;
  cancelled: boolean;
};

/**
 * Ход ИИ: наблюдение → выбор одного действия → команда → новое наблюдение.
 * Ограничен числом команд и отказов подряд; отклонённое действие в этом
 * ходу не повторяется. Отменённый запуск не завершает ход за другого.
 * Управление браузеру отдаётся по бюджету времени порции, пауза ждёт
 * перед шагом, не теряя состояния хода.
 *
 * @returns Память после хода, число команд и причина завершения.
 */
export const playTurn = async (deps: AiTurnDeps): Promise<AiTurnResult> => {
  const config = deps.config ?? AI_CONFIG;
  const rules = deps.rules ?? AI_RULES;
  const turn = createTurnState();
  let memory = deps.memory;
  let commands = 0;
  let failures = 0;
  let reason = 'предел команд за ход';
  const now = deps.now ?? (() => performance.now());
  let chunkStart = now();

  /**
   * Ждёт, пока пауза снята: пауза могла снова начаться за время ожидания.
   * Вызывается только при паузе — без неё шаг идёт в той же задаче.
   */
  const whilePaused = async (first: Promise<void>) => {
    let paused: Promise<void> | null | undefined = first;
    while (paused) {
      // react-doctor-disable-next-line async-await-in-loop -- Пауза держит тот же ход.
      await paused;
      paused = deps.waitWhilePaused?.();
    }
    chunkStart = now();
  };

  while (commands < config.maxCommandsPerTurn) {
    const paused = deps.waitWhilePaused?.();
    // react-doctor-disable-next-line async-await-in-loop -- Пауза держит тот же ход: шаги строго по очереди.
    if (paused) await whilePaused(paused);
    if (deps.isCancelled())
      return { memory, commands, reason: 'отменено', cancelled: true };
    turn.step++;

    const obs = deps.observe();
    const refreshed = refreshMemory(buildContext(obs, memory, turn, config));
    memory = refreshed.memory;
    const ctx = buildContext(obs, memory, turn, config);
    const decision = decideStep(ctx, rules);
    const chosen = decision.chosen;
    const entry = {
      step: turn.step,
      strategy: `${memory.strategy} ${STRATEGY_NAME[memory.strategy]}${
        config.profile ? ` · ${AI_PROFILES[config.profile].name}` : ''
      }`,
      alternatives: decision.alternatives.map(alt => ({
        ruleId: alt.ruleId,
        score: Math.round(alt.weighted),
        reason: alt.reason,
        actorId: alt.actorId,
      })),
    };

    if (!chosen) {
      reason = decision.endReason ?? 'нет действий';
      deps.record?.({
        ...entry,
        ruleId: '—',
        actorId: null,
        action: 'конец хода',
        reason,
        basis: { strategyReason: refreshed.chosen.reason },
        result: 'endTurn',
      });
      break;
    }

    const result = deps.execute(chosen.action);
    deps.record?.({
      ...entry,
      ruleId: chosen.ruleId,
      actorId: chosen.actorId,
      taskId: memory.tasks.find(t => t.unitId === chosen.actorId)?.id,
      action: describe(chosen.action),
      reason: chosen.reason,
      basis: { ...chosen.basis, score: Math.round(chosen.weighted) },
      result: result.ok ? 'ok' : result.code,
    });
    memory = applyOutcome(
      memory,
      chosen as Candidate,
      result.ok,
      obs.turn,
      config.taskReview,
    );

    if (result.ok) {
      commands++;
      failures = 0;
      if (chosen.damage) {
        const { targetId, amount } = chosen.damage;
        turn.plannedDamage.set(
          targetId,
          (turn.plannedDamage.get(targetId) ?? 0) + amount,
        );
      }
      const presentation = deps.afterCommand?.();
      // react-doctor-disable-next-line async-await-in-loop -- Видимые действия ИИ показываются последовательно.
      if (presentation) await presentation;
      if (presentation) chunkStart = now();
    } else {
      turn.failed.add(actionKey(chosen));
      if (++failures >= config.maxConsecutiveFailures) {
        reason = 'повторные отказы команд';
        break;
      }
    }
    if (deps.yieldControl && now() - chunkStart >= config.yieldBudgetMs) {
      // Порция исчерпана: отдаём управление UI, новое наблюдение — после паузы.
      // react-doctor-disable-next-line async-await-in-loop -- Ход ИИ выполняется последовательно.
      await deps.yieldControl();
      chunkStart = now();
    }
  }

  // Пауза, нажатая на последнем перерыве, не должна завершить ход.
  const pausedAtEnd = deps.waitWhilePaused?.();
  if (pausedAtEnd) await whilePaused(pausedAtEnd);
  if (deps.isCancelled())
    return { memory, commands, reason: 'отменено', cancelled: true };
  deps.endTurn();
  return { memory, commands, reason, cancelled: false };
};
