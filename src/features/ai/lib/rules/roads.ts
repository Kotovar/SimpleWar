import { UNKNOWN_MOVE_COST, type Position } from '@shared/config';
import {
  canHaveRoad,
  findCheapestPaths,
  getRoadCost,
  isAdjacent,
} from '@shared/lib';
import type { AiMemory } from '@entities/ai-memories';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { baseAlarm, hasStrikeArmy } from '../facts';
import { cellKey, manhattan, sides } from '../geometry';
import { standCells, stepToward } from '../movement';
import { affordable } from '../saving';
import { idleWorkers } from './builders';

type RoadPlan = NonNullable<AiMemory['roadPlan']>;

/** Самые дешёвые пути от ратуши по известной карте: один расчёт на шаг. */
const pathsFromBase = (ctx: AiContext) => {
  const cached = ctx.cache.get('roadPaths') as
    | ReturnType<typeof findCheapestPaths>
    | undefined;
  if (cached) return cached;
  const paths = findCheapestPaths(ctx.grid(UNKNOWN_MOVE_COST, true), ctx.base!);
  ctx.cache.set('roadPaths', paths);
  return paths;
};

/**
 * Трасса от ратуши к цели: клетка цели или, если на неё не встать
 * (здание), самая дешёвая соседняя. Ратуша в трассу не входит.
 *
 * @returns Клетки трассы и цена пути; пусто, если не дойти.
 */
const roadRoute = (ctx: AiContext, target: Position) => {
  const { cost, previous, width } = pathsFromBase(ctx);
  let goal: number | undefined;
  for (const cell of [target, ...sides(target)]) {
    if (!ctx.inside(cell)) continue;
    const key = cellKey(cell.x, cell.y, width);
    const spent = cost.get(key);
    if (spent && (goal === undefined || spent < cost.get(goal)!)) goal = key;
  }
  if (goal === undefined) return { path: [] as Position[], cost: Infinity };
  const path: Position[] = [];
  for (
    let key: number | undefined = goal;
    key !== undefined && previous.has(key);
    key = previous.get(key)
  ) {
    path.push({ x: key % width, y: Math.floor(key / width) });
  }
  return { path: path.reverse(), cost: cost.get(goal)! };
};

/** Клетки трассы, где дороги ещё нет и её можно проложить. */
const missingRoad = (ctx: AiContext, path: Position[]) =>
  path.filter(({ x, y }) => {
    const type = ctx.known(x, y);
    return (
      !!type &&
      canHaveRoad(type) &&
      !ctx.obs.knownRoads?.[y]?.[x] &&
      !ctx.obs.ownBuildings.some(b => b.x === x && b.y === y)
    );
  });

/** D01: самая дальняя по пути своя добыча, к которой не хватает дороги. */
const supplyPlan = (ctx: AiContext): RoadPlan | null => {
  const { minDistance, minCells } = ctx.config.roads;
  let best: { target: Position; cost: number; path: Position[] } | null = null;
  for (const building of ctx.obs.ownBuildings) {
    if (building.role !== 'resource') continue;
    const { path, cost } = roadRoute(ctx, building);
    if (cost < minDistance || cost === Infinity) continue;
    if (missingRoad(ctx, path).length < minCells) continue;
    if (!best || cost > best.cost) best = { target: building, cost, path };
  }
  return best
    ? {
        ruleId: 'D01',
        target: { x: best.target.x, y: best.target.y },
        cells: best.path,
        since: ctx.obs.turn,
      }
    : null;
};

/**
 * D02: дорога по пути к цели наступления, но не дальше `frontReach` от
 * ратуши и не ближе `frontGap` к цели и известным вражеским зданиям:
 * дорога ничья и не должна вести врага к базе. Бродячие юниты трассу
 * не обрывают — иначе разведчик у своей базы запрещал бы любую дорогу.
 */
const frontPlan = (ctx: AiContext): RoadPlan | null => {
  const target = ctx.memory.operation.target;
  if (!target || !hasStrikeArmy(ctx)) return null;
  const { frontGap, frontReach, minCells } = ctx.config.roads;
  const threats = [
    target,
    ...[...ctx.enemies, ...ctx.remembered].filter(
      ({ kind }) => kind === 'building',
    ),
  ];
  const { path } = roadRoute(ctx, target);
  const safe: Position[] = [];
  for (const cell of path.slice(0, frontReach)) {
    if (threats.some(enemy => manhattan(enemy, cell) <= frontGap)) break;
    safe.push(cell);
  }
  const end = safe.at(-1);
  if (!end || missingRoad(ctx, safe).length < minCells) return null;
  return { ruleId: 'D02', target: end, cells: safe, since: ctx.obs.turn };
};

/** Дорога ещё нужна: цель на месте, трасса не достроена, срок не вышел. */
const isWanted = (ctx: AiContext, plan: RoadPlan) => {
  if (plan.ruleId === 'D01') {
    const building = ctx.obs.ownBuildings.some(
      b => b.x === plan.target.x && b.y === plan.target.y,
    );
    if (!building) return false;
  } else if (ctx.obs.turn - plan.since > ctx.config.roads.hold) {
    return false;
  }
  return missingRoad(ctx, plan.cells).length > 0;
};

/**
 * Выбирает дорогу на несколько ходов: держит начатую, пока она нужна,
 * иначе — после казарм — к дальней добыче или к фронту. При наступлении
 * сначала фронт. Чистая функция для обновления памяти.
 */
export const planRoad = (ctx: AiContext): AiMemory['roadPlan'] => {
  if (!ctx.base) return null;
  const current = ctx.memory.roadPlan;
  if (current && isWanted(ctx, current)) return current;
  if (!ctx.obs.ownBuildings.some(({ type }) => type === 'barracks')) {
    return null;
  }
  const attacking =
    ctx.memory.strategy === 'G08' || ctx.memory.strategy === 'G09';
  const order = attacking ? [frontPlan, supplyPlan] : [supplyPlan, frontPlan];
  for (const plan of order) {
    const picked = plan(ctx);
    if (picked) return picked;
  }
  return null;
};

const ROAD_NAME = { D01: 'к добыче', D02: 'к фронту' };

/**
 * Прокладка выбранной дороги: свободный рабочий без угрозы идёт к
 * ближайшей от ратуши недостроенной клетке трассы и кладёт дорогу, если
 * дерево не нужно на более важные покупки или его с запасом.
 */
const roadWork = (
  ctx: AiContext,
  ruleId: RoadPlan['ruleId'],
  group: Candidate['group'],
): Candidate[] => {
  const plan = ctx.memory.roadPlan;
  if (plan?.ruleId !== ruleId || !ctx.base || baseAlarm(ctx).length) return [];
  const missing = missingRoad(ctx, plan.cells);
  const next = missing.find(({ x, y }) => !ctx.occupied(x, y));
  const type = next && ctx.known(next.x, next.y);
  if (!next || !type) return [];
  // Дорога дешёвая: в обход накоплений, если дерева с запасом.
  const cost = getRoadCost(type);
  const spare = ctx.budget.wood >= cost.wood + ctx.config.roads.woodSpare;
  if (!spare && !affordable(ctx, cost)) return [];
  const worker = idleWorkers(ctx, ruleId)
    .filter(w => w.buildPoints > 0 && ctx.threatAt(w) === 0)
    .sort((a, b) => manhattan(a, next) - manhattan(b, next))[0];
  if (!worker) return [];
  const reason = `дорога ${ROAD_NAME[ruleId]}: ещё ${missing.length} кл.`;
  const basis = { x: next.x, y: next.y };

  if (isAdjacent(worker, next) && ctx.obs.visible[next.y]?.[next.x]) {
    return [
      {
        ruleId,
        group,
        actorId: worker.id,
        action: { type: 'buildRoad', workerId: worker.id, ...next },
        score: 30,
        reason,
        basis,
      },
    ];
  }
  const step = stepToward(ctx, worker, standCells(ctx, next));
  if (!step) return [];
  return [
    {
      ruleId,
      group,
      actorId: worker.id,
      action: { type: 'move', unitId: worker.id, ...step.next },
      score: 25,
      reason: `${reason}, иду к трассе`,
      basis,
    },
  ];
};

/** D01: дорога от ратуши к дальнему руднику или лесопилке. */
export const D01: AiRule = {
  id: 'D01',
  group: 'economy',
  title: 'Дорога к добыче',
  evaluate: ctx => roadWork(ctx, 'D01', 'economy'),
};

/** D02: дорога от ратуши к фронту при собранной ударной группе. */
export const D02: AiRule = {
  id: 'D02',
  group: 'attack',
  title: 'Дорога к фронту',
  evaluate: ctx => roadWork(ctx, 'D02', 'attack'),
};
