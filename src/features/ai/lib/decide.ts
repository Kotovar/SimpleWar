import type { AiRule, Candidate, Decision } from '../model/types';
import type { AiContext } from './context';
import { tieBreak } from './geometry';
import { AI_RULES } from './rules';

/** Ключ действия: одинаковое действие одного правила — одна попытка. */
export const actionKey = (candidate: Pick<Candidate, 'ruleId' | 'action'>) =>
  `${candidate.ruleId}:${JSON.stringify(candidate.action)}`;

/**
 * Ключ для разрешения равных оценок: ID объектов случайны, поэтому вместо
 * них — тип и клетка. Тот же сценарий и сид дают тот же выбор.
 */
const stableKeys = (ctx: AiContext) => {
  const places = new Map<string, string>();
  for (const entity of [
    ...ctx.obs.ownUnits,
    ...ctx.obs.ownBuildings,
    ...ctx.enemies,
    ...ctx.remembered,
  ]) {
    places.set(entity.id, `${entity.type}@${entity.x},${entity.y}`);
  }
  return (candidate: Pick<Candidate, 'ruleId' | 'action'>) =>
    `${candidate.ruleId}:${JSON.stringify(candidate.action, (_, value) =>
      typeof value === 'string' ? (places.get(value) ?? value) : value,
    )}`;
};

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
  const keyOf = stableKeys(ctx);
  const sorted = candidates
    .map(c => ({ c, tie: tieBreak(salt + keyOf(c), ctx.memory.seed) }))
    .sort((a, b) => b.c.weighted - a.c.weighted || a.tie - b.tie)
    .map(({ c }) => c);

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
