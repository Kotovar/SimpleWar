import {
  BUILDINGS_CONFIG,
  RESEARCH_CONFIG,
  RESEARCH_TYPES,
  UNITS_CONFIG,
  type Cost,
} from '@shared/config';
import { roleWishes } from './composition';
import type { AiContext } from './context';
import { bestResearch } from './researchValue';
import {
  baseAlarm,
  desiredArmy,
  desiredWorkers,
  hasStrikeArmy,
  idleWorkplaces,
  nextRecruit,
  resourceSites,
  scarceResource,
} from './facts';

/** Накопление: какие покупки важнее и что из бюджета отложено под них. */

const NOTHING: Cost = { gold: 0, wood: 0 };

/**
 * Нужен ли ещё один рудник/лесопилка: `expansion.start` с начала партии,
 * затем +1 каждые `expansion.every` ходов (до `max`) нехватающего ресурса,
 * если есть безопасная площадка и нет простаивающего места этого типа. Первое здание — отдельная цель.
 */
export const expansionWanted = (ctx: AiContext, type: 'mine' | 'sawmill') => {
  const { start, every, max } = ctx.config.expansion;
  const target = Math.min(max, start + Math.floor(ctx.obs.turn / every));
  const count = ctx.obs.ownBuildings.filter(b => b.type === type).length;
  const resource = type === 'mine' ? 'gold' : 'wood';
  return (
    count > 0 &&
    count < target &&
    // Сверх стартовой — только нехватающий ресурс: излишек не нужен.
    (count < start || scarceResource(ctx) === resource) &&
    resourceSites(ctx, type === 'mine' ? 'gold' : 'forest').length > 0 &&
    !idleWorkplaces(ctx).some(b => b.type === type)
  );
};

/** Стартовая добыча этого типа ещё не набрана, а казарм нет. */
const inOpening = (ctx: AiContext, type: 'mine' | 'sawmill') =>
  !ctx.obs.ownBuildings.some(b => b.type === 'barracks') &&
  expansionWanted(ctx, type) &&
  ctx.obs.ownBuildings.filter(b => b.type === type).length <
    ctx.config.expansion.start;

/** Стартовая добыча не закрыта: казармы ждут её (W07). */
export const openingPending = (ctx: AiContext) =>
  inOpening(ctx, 'mine') || inOpening(ctx, 'sawmill');

/** Цель накопления: ключ покупки и её цена. */
export type SavingGoal = { key: string; cost: Cost };

/**
 * Здание найма нужной роли, на которое копят раньше кузницы: роль есть,
 * здания нет, нанять по пожеланиям в готовых зданиях некого, армия от 3.
 * При стратегии исследований (G12) кузница остаётся первой. W07 строит в
 * том же порядке, иначе резерв одной цели запрещал бы другую.
 */
export const earlyProducer = (ctx: AiContext) => {
  if (ctx.memory.strategy === 'G12' || ctx.military.length < 3) return null;
  const has = (type: string) =>
    ctx.obs.ownBuildings.some(building => building.type === type);
  if (!has('barracks')) return null;
  const roles = roleWishes(ctx);
  if (roles.some(wish => has(wish.producer))) return null;
  return roles.find(wish => !has(wish.producer)) ?? null;
};

/**
 * Две первые по важности покупки, на которые копит ИИ: рудник → второй
 * рабочий → лесопилка → рабочие до нормы → стартовая добыча → казармы →
 * ферма → ещё рудник/лесопилка → кузница → исследование → здание найма нужной роли → армия. Их цена откладывается от
 * бюджета остальных правил, иначе мелкие траты не дают накопить на добычу.
 */
export const savingGoals = (ctx: AiContext): SavingGoal[] => {
  const has = (type: string) =>
    ctx.obs.ownBuildings.some(building => building.type === type);
  const { occupied, max } = ctx.obs.population;
  // Роли по составу врага: здание найма и сам юнит тоже копятся, иначе
  // каждый свободный золотой уходит на мечника.
  const roles = has('barracks') ? roleWishes(ctx) : [];
  const producer = roles.find(wish => !has(wish.producer));
  const recruit = roles.find(wish => has(wish.producer));
  const research =
    has('forge') && !ctx.obs.researching ? bestResearch(ctx) : null;
  // Кузница и исследование не отнимают резерв, пока нет минимальной обороны.
  const defended = ctx.military.length >= 2 && !baseAlarm(ctx).length;
  const early = earlyProducer(ctx);
  const wishes: [string, boolean, Cost][] = [
    [
      'mine',
      !has('mine') && resourceSites(ctx, 'gold').length > 0,
      BUILDINGS_CONFIG.mine.cost,
    ],
    ['worker', ctx.workers.length < 2, UNITS_CONFIG.worker.cost],
    [
      'sawmill',
      !has('sawmill') && resourceSites(ctx, 'forest').length > 0,
      BUILDINGS_CONFIG.sawmill.cost,
    ],
    // Рабочие до нормы: иначе все на добыче и строить казармы некому.
    [
      'worker',
      has('sawmill') && ctx.workers.length < desiredWorkers(ctx),
      UNITS_CONFIG.worker.cost,
    ],
    // Стартовая добыча до казарм: без дохода армия копится слишком долго.
    ['mine', inOpening(ctx, 'mine'), BUILDINGS_CONFIG.mine.cost],
    ['sawmill', inOpening(ctx, 'sawmill'), BUILDINGS_CONFIG.sawmill.cost],
    ['barracks', !has('barracks'), BUILDINGS_CONFIG.barracks.cost],
    // Ферма раньше здания найма: без населения найм невозможен вовсе.
    ['farm', max - occupied < 3 && max < 30, BUILDINGS_CONFIG.farm.cost],
    ['mine', expansionWanted(ctx, 'mine'), BUILDINGS_CONFIG.mine.cost],
    ['sawmill', expansionWanted(ctx, 'sawmill'), BUILDINGS_CONFIG.sawmill.cost],
    // Здание найма нужной роли — раньше кузницы, как и в W07.
    [
      early?.producer ?? 'producer',
      !!early,
      early ? BUILDINGS_CONFIG[early.producer].cost : NOTHING,
    ],
    // Кузница в затянувшейся партии, пока есть что изучать (G12, W07).
    [
      'forge',
      !has('forge') &&
        defended &&
        hasStrikeArmy(ctx) &&
        ctx.obs.turn >= ctx.config.forgeTurn &&
        ctx.obs.researched.length < RESEARCH_TYPES.length,
      BUILDINGS_CONFIG.forge.cost,
    ],
    // Исследование — после добычи, но до армии, если оборона уже есть.
    [
      'research',
      !!research && defended,
      research ? RESEARCH_CONFIG[research.type].cost : NOTHING,
    ],
    [
      producer?.producer ?? 'producer',
      // Пока есть кого нанять в готовых зданиях, копим на юнита, не на
      // здание; раньше кузницы оно уже учтено выше.
      !!producer && !recruit && ctx.military.length >= 3 && !early,
      producer ? BUILDINGS_CONFIG[producer.producer].cost : NOTHING,
    ],
    [
      'army',
      ctx.military.length < desiredArmy(ctx),
      UNITS_CONFIG[recruit?.type ?? nextRecruit(ctx)].cost,
    ],
  ];
  return wishes
    .filter(([, wanted]) => wanted)
    .slice(0, 2)
    .map(([key, , cost]) => ({ key, cost }));
};

/**
 * Можно ли оплатить цену из бюджета: без резервов задач и без отложенного
 * на более важные цели накопления. Цель уступает только целям выше неё,
 * иначе две цели блокировали бы друг друга.
 *
 * @param key - Ключ покупки (`mine`, `barracks`, `worker`, `army`…).
 */
export const affordable = (ctx: AiContext, cost: Cost, key?: string) => {
  const goals = savingGoals(ctx);
  const rank = goals.findIndex(goal => goal.key === key);
  const held = (rank === -1 ? goals : goals.slice(0, rank)).reduce(
    (sum, goal) => ({
      gold: sum.gold + goal.cost.gold,
      wood: sum.wood + goal.cost.wood,
    }),
    { gold: 0, wood: 0 },
  );
  return (
    ctx.budget.gold - held.gold >= cost.gold &&
    ctx.budget.wood - held.wood >= cost.wood
  );
};
