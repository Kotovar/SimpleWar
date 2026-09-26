import type { StrategyId } from '@shared/config';
import type { AiMemory } from '@entities/ai-memories';
import type { StrategyScore } from '../model/types';
import type { AiContext } from './context';
import {
  baseAlarm,
  desiredArmy,
  desiredWorkers,
  enemyPower,
  enemyTarget,
  idleWorkplaces,
  ownPower,
  resourceSites,
  scarceResource,
} from './facts';
import { manhattan, tieBreak } from './geometry';
import { strikeGroup } from './operation';

type Evaluator = (ctx: AiContext) => Omit<StrategyScore, 'id'>;

/**
 * Оценки стратегий G01–G12 по наблюдению. Каждая — отдельная функция:
 * новая стратегия добавляется записью, без правки выбора.
 */
export const STRATEGIES: Record<StrategyId, Evaluator> = {
  G01: ctx => {
    const alarm = baseAlarm(ctx);
    return alarm.length
      ? { score: 100, reason: `у ратуши врагов: ${alarm.length}` }
      : { score: 0, reason: 'угрозы ратуше нет' };
  },
  G02: ctx => {
    const idle = idleWorkplaces(ctx).length;
    const missing = Math.max(0, desiredWorkers(ctx) - ctx.workers.length);
    const lowIncome = ctx.income.gold + ctx.income.wood < 10 ? 20 : 0;
    const score = Math.min(80, idle * 20 + missing * 12 + lowIncome);
    return {
      score,
      reason: `простаивает мест: ${idle}, нужно рабочих: ${missing}`,
    };
  },
  G03: ctx => {
    const busy = idleWorkplaces(ctx).length === 0;
    const need = scarceResource(ctx) === 'gold' ? 'gold' : 'forest';
    const sites = resourceSites(ctx, need).length;
    return busy && sites
      ? { score: 35, reason: `свободных площадок ${need}: ${sites}` }
      : { score: 0, reason: 'расширение не нужно или негде' };
  },
  G04: ctx => {
    const lack = Math.max(0, desiredArmy(ctx) - ctx.military.length);
    const { occupied, max } = ctx.obs.population;
    const cramped = max - occupied < 3 ? 15 : 0;
    return {
      score: Math.min(75, lack * 12 + cramped),
      reason: `армия ${ctx.military.length} из ${desiredArmy(ctx)}`,
    };
  },
  G05: ctx =>
    enemyTarget(ctx)
      ? { score: 0, reason: 'вражеское здание известно' }
      : {
          score: Math.min(60, 15 + ctx.obs.turn * 2),
          reason: 'вражеская база не найдена',
        },
  G06: ctx => {
    const noGold = resourceSites(ctx, 'gold').length === 0;
    const noWood = resourceSites(ctx, 'forest').length === 0;
    const hasGold = ctx.obs.ownBuildings.some(({ type }) => type === 'mine');
    const hasWood = ctx.obs.ownBuildings.some(({ type }) => type === 'sawmill');
    const missing = (!hasGold && noGold) || (!hasWood && noWood);
    return missing
      ? { score: 45, reason: 'нужный ресурс не найден' }
      : { score: 0, reason: 'ресурсы известны' };
  },
  G07: ctx => {
    const stale = ctx.obs.contacts.filter(
      contact => contact.kind === 'unit' && contact.confidence === 'stale',
    ).length;
    return stale
      ? { score: 20 + stale * 5, reason: `устаревших контактов: ${stale}` }
      : { score: 0, reason: 'контакты свежие' };
  },
  G08: ctx => {
    const own = ownPower(ctx);
    const enemy = enemyPower(ctx);
    const group = strikeGroup(ctx).length;
    const ratio = enemy > 0 ? own / enemy : own > 0 ? 2 : 0;
    const ready = group >= ctx.config.strikeGroup.size;
    const waited =
      ctx.memory.operation.phase === 'gather' &&
      ctx.obs.turn - ctx.memory.operation.since >=
        ctx.config.strikeGroup.gatherTimeout;
    if ((ready && ratio >= ctx.config.attackRatio) || (waited && group >= 2)) {
      return {
        score: 55 + Math.min(25, (ratio - 1) * 20),
        reason: `сила ${own.toFixed(0)} против ${enemy.toFixed(0)}, группа ${group}`,
      };
    }
    return {
      score: 0,
      reason: `группа ${group}, соотношение ${ratio.toFixed(2)}`,
    };
  },
  G09: ctx => {
    const prey = ctx.enemies.filter(
      enemy => !enemy.armed && enemy.kind === 'unit',
    );
    const guards = ctx.enemies.filter(enemy => enemy.armed).length;
    return prey.length && guards === 0 && ctx.military.length >= 2
      ? { score: 40, reason: `беззащитных рабочих врага: ${prey.length}` }
      : { score: 0, reason: 'уязвимой экономики врага не видно' };
  },
  G10: ctx => {
    const { base } = ctx;
    if (!base || baseAlarm(ctx).length) return { score: 0, reason: '—' };
    const near = [...ctx.enemies, ...ctx.remembered].filter(
      enemy =>
        enemy.armed &&
        enemy.kind === 'unit' &&
        manhattan(enemy, base) <= ctx.config.alertRadius * 2,
    ).length;
    return near
      ? {
          score: 30 + near * 5,
          reason: `вооружённых врагов у подходов: ${near}`,
        }
      : { score: 0, reason: 'направление угрозы неизвестно' };
  },
  G11: ctx => {
    const group = strikeGroup(ctx);
    const phase = ctx.memory.operation.phase;
    if (!group.length || (phase !== 'advance' && phase !== 'engage')) {
      return { score: 0, reason: 'группа не в бою' };
    }
    const own = group.reduce((sum, unit) => sum + unit.hp * unit.attack, 0);
    const foes = ctx.enemies
      .filter(enemy => enemy.armed)
      .reduce((sum, enemy) => sum + enemy.hp * enemy.attack, 0);
    const ratio = foes > 0 ? own / foes : 2;
    return ratio < ctx.config.retreatRatio
      ? { score: 85, reason: `проигрываем бой: ${ratio.toFixed(2)}` }
      : { score: 0, reason: `соотношение в бою ${ratio.toFixed(2)}` };
  },
  // Исследований в текущей версии нет (S16): стратегия не выбирается.
  G12: () => ({ score: 0, reason: 'исследования ещё не реализованы' }),
};

/** Оценки всех стратегий. */
export const evaluateStrategies = (ctx: AiContext): StrategyScore[] =>
  (Object.keys(STRATEGIES) as StrategyId[]).map(id => ({
    id,
    ...STRATEGIES[id](ctx),
  }));

/**
 * Выбирает стратегию с удержанием: срочная оборона (G01) прерывает всё
 * сразу; обычная смена — только после срока удержания и при заметном
 * преимуществе оценки. Равные оценки разрешаются по сиду.
 *
 * @returns Новая память и выбранная оценка.
 */
export const chooseStrategy = (
  ctx: AiContext,
  scores: StrategyScore[],
): { memory: AiMemory; chosen: StrategyScore } => {
  const { memory, config } = ctx;
  const turn = ctx.obs.turn;
  const rank = (a: StrategyScore, b: StrategyScore) =>
    b.score - a.score ||
    tieBreak(`${turn}:${a.id}`, memory.seed) -
      tieBreak(`${turn}:${b.id}`, memory.seed);
  const best = [...scores].sort(rank)[0];
  const current = scores.find(({ id }) => id === memory.strategy) ?? best;

  const keep = (chosen: StrategyScore) =>
    chosen.id === memory.strategy
      ? { memory: { ...memory, strategyScore: chosen.score }, chosen }
      : {
          memory: {
            ...memory,
            strategy: chosen.id,
            strategyScore: chosen.score,
            strategySince: turn,
          },
          chosen,
        };

  if (best.id === 'G01' && best.score > 0) return keep(best);
  // Тревога снята — удерживать оборону больше не нужно.
  if (memory.strategy === 'G01' && current.score === 0) return keep(best);
  const held = turn - memory.strategySince;
  if (current.score > 0 && held < config.strategyHold) return keep(current);
  return best.score >= current.score + config.strategySwitchMargin ||
    current.score === 0
    ? keep(best)
    : keep(current);
};
