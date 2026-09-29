import {
  UNITS_CONFIG,
  type Building,
  type Cost,
  type Position,
  type ProductionBuilding,
  type UnitType,
} from '@shared/config';
import { isBuildableTerrain } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { desiredArmy, desiredWorkers, nearest, nextRecruit } from '../facts';
import { affordable } from '../saving';
import { roleWishes } from '../composition';
import { around, manhattan, tieBreak } from '../geometry';
import { hasRoom } from '../movement';
import { isFree } from './common';

/** Срочная оборона базы (G01). */
const urgent = (ctx: AiContext) => ctx.memory.strategy === 'G01';

/**
 * Свободная клетка для новобранца: поле или холм, не под отметкой удара,
 * без угрозы (при G01 — с наименьшей угрозой).
 */
const spawnCell = (ctx: AiContext, building: Building, toward?: Position) => {
  const cells = around(building).filter(
    cell =>
      ctx.inside(cell) &&
      isBuildableTerrain('grass', ctx.known(cell.x, cell.y) ?? 'water') &&
      !ctx.occupied(cell.x, cell.y) &&
      !ctx.struck(cell) &&
      // При срочной обороне безопасных клеток у осаждённой базы нет:
      // лучше защитник под угрозой, чем никакого.
      (urgent(ctx) || ctx.threatAt(cell) === 0) &&
      hasRoom(ctx, cell),
  );
  const goal = toward ?? { x: ctx.width / 2, y: ctx.height / 2 };
  return cells.sort(
    (a, b) =>
      ctx.threatAt(a) - ctx.threatAt(b) ||
      manhattan(a, goal) - manhattan(b, goal) ||
      tieBreak(`${a.x},${a.y}`, ctx.memory.seed) -
        tieBreak(`${b.x},${b.y}`, ctx.memory.seed),
  )[0];
};

/** Сколько ходов копить на лучника, прежде чем взять мечника. */
const WAIT_TURNS = 4;

/** Через сколько ходов хватит свободного бюджета при текущем доходе. */
const turnsToAfford = (ctx: AiContext, cost: Cost) =>
  Math.max(
    ...(['gold', 'wood'] as const).map(key => {
      const lack = cost[key] - ctx.budget[key];
      if (lack <= 0) return 0;
      return ctx.income[key] > 0 ? Math.ceil(lack / ctx.income[key]) : Infinity;
    }),
  );

export const canHire = (
  ctx: AiContext,
  building: ProductionBuilding,
  type: UnitType,
) => {
  const { cost, requiresLimit } = UNITS_CONFIG[type];
  const { occupied, max } = ctx.obs.population;
  return (
    isFree(ctx, building.id) &&
    building.spawnPoints > 0 &&
    building.spawningUnits.includes(type) &&
    occupied + requiresLimit <= max &&
    affordable(ctx, cost, type === 'worker' ? 'worker' : 'army')
  );
};

export const hire = (
  ctx: AiContext,
  ruleId: string,
  group: Candidate['group'],
  building: ProductionBuilding,
  type: UnitType,
  score: number,
  reason: string,
): Candidate[] => {
  const cell = spawnCell(ctx, building);
  if (!cell) return [];
  return [
    {
      ruleId,
      group,
      actorId: building.id,
      action: {
        type: 'spawn',
        buildingId: building.id,
        unitType: type,
        ...cell,
      },
      score,
      reason,
      basis: { unit: type },
    },
  ];
};

export const producers = (ctx: AiContext) =>
  ctx.obs.ownBuildings.filter(
    (b): b is ProductionBuilding => b.role === 'production',
  );

/** N01 (G02): рабочих меньше нужного — нанять в ратуше. */
export const N01: AiRule = {
  id: 'N01',
  group: 'economy',
  title: 'Найм рабочего',
  evaluate: ctx => {
    const want = desiredWorkers(ctx);
    if (ctx.workers.length >= want) return [];
    const base = producers(ctx).find(b => canHire(ctx, b, 'worker'));
    if (!base) return [];
    const score = ctx.workers.length < 2 ? 65 : 45;
    return hire(
      ctx,
      'N01',
      'economy',
      base,
      'worker',
      score,
      `рабочих ${ctx.workers.length} из ${want}`,
    );
  },
};

/**
 * N02 (G04): армии меньше нужного — нанять в казармах. Состав задаёт
 * `nextRecruit`: пока копятся ресурсы на лучника, мечник вместо него не
 * покупается — иначе золото уходит на мечников и лучников нет. При срочной
 * обороне берётся любой доступный.
 */
export const N02: AiRule = {
  id: 'N02',
  group: 'hire',
  title: 'Найм войск',
  evaluate: ctx => {
    const lack = desiredArmy(ctx) - ctx.military.length;
    const urgent = ctx.memory.strategy === 'G01';
    if (lack <= 0 && !urgent) return [];
    // Нужная роль с готовым зданием найма пока не по карману, но скоро
    // накопится — не тратить бюджет на мечника (её наймёт N03).
    const role = roleWishes(ctx).find(wish =>
      ctx.obs.ownBuildings.some(({ type }) => type === wish.producer),
    );
    const wait = role ? turnsToAfford(ctx, UNITS_CONFIG[role.type].cost) : 0;
    if (!urgent && wait > 0 && wait <= WAIT_TURNS) return [];
    const preferred = nextRecruit(ctx);
    // Лучника ждём, только если он накопится за несколько ходов.
    const wanted =
      turnsToAfford(ctx, UNITS_CONFIG[preferred].cost) <= WAIT_TURNS
        ? preferred
        : 'swordsman';
    const order: UnitType[] = urgent
      ? [wanted, wanted === 'archer' ? 'swordsman' : 'archer']
      : [wanted];
    for (const building of producers(ctx)) {
      const type = order.find(t => canHire(ctx, building, t));
      if (!type) continue;
      const threat = nearest(
        building,
        ctx.enemies.filter(({ armed }) => armed),
      );
      return hire(
        ctx,
        'N02',
        'hire',
        building,
        type,
        45 + Math.max(0, lack) * 4 + (urgent ? 20 : 0),
        threat
          ? 'нужна защита'
          : `армия ${ctx.military.length} из ${desiredArmy(ctx)}`,
      );
    }
    return [];
  },
};
