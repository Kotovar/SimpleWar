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
export const desiredArmy = (ctx: AiContext) => {
  const { base, every, max } = ctx.config.army;
  return Math.min(max, base + Math.floor(ctx.obs.turn / every));
};

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
