import {
  BUILDINGS_CONFIG,
  UNITS_CONFIG,
  type Building,
  type Cost,
  type Position,
} from '@shared/config';
import { findServingWorker } from '@shared/lib';
import type { AiContext, EnemyView } from './context';
import { manhattan } from './geometry';
import { roleWishes } from './composition';
import { standCells } from './movement';

export { isNear, nearest } from './geometry';

/** Свои рудники и лесопилки без рабочего рядом. */
export const idleWorkplaces = (ctx: AiContext): Building[] =>
  ctx.obs.ownBuildings.filter(
    building =>
      building.role === 'resource' &&
      !findServingWorker(building, ctx.obs.ownUnits),
  );

/**
 * Известные свободные клетки ресурса: без здания, с клеткой для рабочего
 * и без известной угрозы. Скрытые клетки сюда не попадают.
 *
 * @param type - Золото или лес.
 */
export const resourceSites = (
  ctx: AiContext,
  type: 'gold' | 'forest',
): Position[] =>
  ctx.obs.resources.filter(
    cell =>
      cell.type === type &&
      !ctx.occupied(cell.x, cell.y) &&
      ctx.threatAt(cell) === 0 &&
      standCells(ctx, cell).length > 0,
  );

/** Вооружённые видимые враги в радиусе тревоги у ратуши. */
export const baseAlarm = (ctx: AiContext): EnemyView[] => {
  const { base } = ctx;
  if (!base) return [];
  return ctx.enemies.filter(
    enemy =>
      enemy.armed &&
      enemy.kind === 'unit' &&
      manhattan(enemy, base) <= ctx.config.alertRadius,
  );
};

/**
 * Известная цель наступления: вражеская ратуша, иначе ближайшее к своей
 * базе известное вражеское здание. Места из генератора не используются.
 */
export const enemyTarget = (ctx: AiContext): EnemyView | null => {
  const buildings = [...ctx.enemies, ...ctx.remembered].filter(
    ({ kind }) => kind === 'building',
  );
  const base = buildings.find(({ type }) => type === 'base');
  if (base) return base;
  const from = ctx.base ?? ctx.obs.ownUnits[0];
  if (!from || buildings.length === 0) return null;
  return [...buildings].sort(
    (a, b) => manhattan(a, from) - manhattan(b, from),
  )[0];
};

/** Сколько рабочих держать: по месту на каждое здание добычи и строитель. */
export const desiredWorkers = (ctx: AiContext) => {
  const places = ctx.obs.ownBuildings.filter(
    ({ role }) => role === 'resource',
  ).length;
  const { min, max } = ctx.config.workerTarget;
  return Math.min(max, Math.max(min, places + 1));
};

/** Желаемый размер армии: растёт со временем партии. */
export const desiredArmy = (ctx: AiContext) =>
  Math.min(10, 2 + Math.floor(ctx.obs.turn / 5));

/** Кого нанять следующим: лучника при мечниках ≥ 2 × лучники + 1. */
export const nextRecruit = (ctx: AiContext): 'swordsman' | 'archer' => {
  const swords = ctx.military.filter(({ type }) => type === 'swordsman');
  const archers = ctx.military.filter(({ type }) => type === 'archer').length;
  return swords.length >= archers * 2 + 1 ? 'archer' : 'swordsman';
};

/** Ближайшие траты стратегии: что ИИ хочет купить в первую очередь. */
export const plannedCosts = (ctx: AiContext): Cost => {
  const costs: Cost[] = [];
  const has = (type: string) =>
    ctx.obs.ownBuildings.some(building => building.type === type);
  if (!has('barracks')) costs.push(BUILDINGS_CONFIG.barracks.cost);
  if (!has('sawmill')) costs.push(BUILDINGS_CONFIG.sawmill.cost);
  if (!has('mine')) costs.push(BUILDINGS_CONFIG.mine.cost);
  const { occupied, max } = ctx.obs.population;
  if (max - occupied < 3) costs.push(BUILDINGS_CONFIG.farm.cost);
  costs.push(UNITS_CONFIG.swordsman.cost, UNITS_CONFIG.archer.cost);
  return costs.reduce(
    (sum, cost) => ({ gold: sum.gold + cost.gold, wood: sum.wood + cost.wood }),
    { gold: 0, wood: 0 },
  );
};

/**
 * Какого ресурса не хватает сильнее: недостача ближайших трат, делённая на
 * доход. Одинаково — золото: на него нанимается армия.
 */
export const scarceResource = (ctx: AiContext): 'gold' | 'wood' => {
  const need = plannedCosts(ctx);
  const lack = (key: 'gold' | 'wood') =>
    Math.max(0, need[key] - ctx.obs.stock[key]) / Math.max(1, ctx.income[key]);
  return lack('wood') > lack('gold') ? 'wood' : 'gold';
};

const NOTHING: Cost = { gold: 0, wood: 0 };

/** Цель накопления: ключ покупки и её цена. */
export type SavingGoal = { key: string; cost: Cost };

/**
 * Две первые по важности покупки, на которые копит ИИ: рудник → второй
 * рабочий → лесопилка → казармы → ферма → армия. Их цена откладывается от
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
    ['barracks', !has('barracks'), BUILDINGS_CONFIG.barracks.cost],
    [
      producer?.producer ?? 'producer',
      // Пока есть кого нанять в готовых зданиях, копим на юнита, не на здание.
      !!producer && !recruit && ctx.military.length >= 3,
      producer ? BUILDINGS_CONFIG[producer.producer].cost : NOTHING,
    ],
    ['farm', max - occupied < 3 && max < 30, BUILDINGS_CONFIG.farm.cost],
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
