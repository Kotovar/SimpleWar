import type { AiRule, Candidate, Decision } from '../model/types';
import type { AiContext } from './context';
import { tieBreak } from './geometry';
import { AI_RULES } from './rules';

/** Ключ действия: одинаковое действие одного правила — одна попытка. */
export const actionKey = (candidate: Pick<Candidate, 'ruleId' | 'action'>) =>
  `${candidate.ruleId}:${JSON.stringify(candidate.action)}`;

/**
 * Выбирает одно действие шага: собирает предложения всех правил, применяет
 * вес текущей стратегии, отбрасывает исполнителей, закончивших ход, и
 * действия, уже отклонённые в этом ходу. Равные оценки разрешаются по сиду.
 *
 * @param ctx - Контекст шага.
 * @param rules - Реестр правил; в тестах можно подменить.
 */
export const decideStep = (
  ctx: AiContext,
  rules: AiRule[] = AI_RULES,
): Decision => {
  const weights = ctx.config.strategyWeights[ctx.memory.strategy];
  const candidates = rules
    .flatMap(rule =>
      rule
        .evaluate(ctx)
        .map(candidate => ({ ...candidate, group: rule.group })),
    )
    .filter(
      candidate =>
        (candidate.actorId === null || !ctx.turn.done.has(candidate.actorId)) &&
        !ctx.turn.failed.has(actionKey(candidate)),
    )
    .map(candidate => ({
      ...candidate,
      weighted: candidate.score * weights[candidate.group],
    }));

  const salt = `${ctx.obs.turn}:${ctx.turn.step}:`;
  const sorted = candidates.sort(
    (a, b) =>
      b.weighted - a.weighted ||
      tieBreak(salt + actionKey(a), ctx.memory.seed) -
        tieBreak(salt + actionKey(b), ctx.memory.seed),
  );

  const chosen =
    sorted.find(
      candidate =>
        candidate.action.type !== 'wait' &&
        candidate.weighted >= ctx.config.minScore,
    ) ?? null;

  return {
    chosen,
    alternatives: sorted.filter(c => c !== chosen).slice(0, 5),
    endReason: chosen
      ? undefined
      : sorted.length
        ? 'нет полезных действий'
        : 'нет законных действий',
  };
};
