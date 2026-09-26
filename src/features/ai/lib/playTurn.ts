import { AI_CONFIG, STRATEGY_NAME, type CommandResult } from '@shared/config';
import type { AiMemory } from '@entities/ai-memories';
import type { AiDecisionInput } from '@entities/journals';
import type { Observation } from '@entities/perceptions';
import type { AiAction, AiRule, Candidate } from '../model/types';
import { buildContext } from './context';
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

/** Короткий ID для текста журнала; полный ID остаётся в полях записи. */
const short = (id: string) => id.slice(0, 13);

const describe = (action: AiAction) => {
  switch (action.type) {
    case 'move':
      return `движение в (${action.x}, ${action.y})`;
    case 'attack':
      return `атака ${short(action.targetId)}`;
    case 'build':
      return `стройка ${action.buildingType} в (${action.x}, ${action.y})`;
    case 'spawn':
      return `найм ${action.unitType}`;
    case 'assign':
      return `на добычу ${short(action.buildingId)}`;
    case 'unassign':
      return 'снят с добычи';
    case 'repair':
      return `ремонт ${short(action.buildingId)}`;
    case 'clearForest':
      return `расчистка (${action.x}, ${action.y})`;
    case 'demolish':
      return `снос ${short(action.buildingId)}`;
    case 'wait':
      return 'ожидание';
  }
};

/**
 * Ход ИИ: наблюдение → выбор одного действия → команда → новое наблюдение.
 * Ограничен числом команд и отказов подряд; отклонённое действие в этом
 * ходу не повторяется. Отменённый запуск не завершает ход за другого.
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

  while (commands < config.maxCommandsPerTurn) {
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
      strategy: `${memory.strategy} ${STRATEGY_NAME[memory.strategy]}`,
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
    } else {
      turn.failed.add(actionKey(chosen));
      if (++failures >= config.maxConsecutiveFailures) {
        reason = 'повторные отказы команд';
        break;
      }
    }
    if (deps.yieldControl && turn.step % config.yieldEvery === 0) {
      await deps.yieldControl();
    }
  }

  if (deps.isCancelled())
    return { memory, commands, reason: 'отменено', cancelled: true };
  deps.endTurn();
  return { memory, commands, reason, cancelled: false };
};
