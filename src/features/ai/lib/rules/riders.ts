import { getTargetCategory } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { cellKey, manhattan } from '../geometry';
import { turnMoves } from '../movement';
import { isDoomed, meleeThreat, moveTo } from './common';
import { cellsNear, strikeBest, unitsOf } from './roleKit';

export const riders = (ctx: AiContext) => unitsOf(ctx, 'rider');

/** Нет ли рядом с целью её вооружённой защиты. */
const unguarded = (ctx: AiContext, target: EnemyView) =>
  !ctx.enemies.some(
    e =>
      e.armed &&
      e.id !== target.id &&
      manhattan(e, target) <= e.range + 1 &&
      e.type !== 'healer',
  );

/**
 * Рейд вплотную: ударить, если цель рядом, иначе встать у ближайшей цели,
 * к которой есть клетка удара в пределах этого хода (с дорогами, по ценам
 * команды движения).
 */
const raid = (
  ctx: AiContext,
  ruleId: string,
  unit: Parameters<typeof strikeBest>[2],
  targets: EnemyView[],
  score: number,
  reason: string,
): Candidate[] => {
  const ids = new Set(targets.map(({ id }) => id));
  const hit = strikeBest(
    ctx,
    ruleId,
    unit,
    e => 30 - e.hp / 10,
    score,
    reason,
    e => ids.has(e.id),
  );
  if (hit.length) return hit;
  const reach = new Map(
    turnMoves(ctx, unit).map(cell => [
      cellKey(cell.x, cell.y, ctx.width),
      cell,
    ]),
  );
  const prey = targets
    .filter(e => !isDoomed(ctx, e))
    .sort((a, b) => manhattan(unit, a) - manhattan(unit, b));
  for (const enemy of prey) {
    const cell = cellsNear(ctx, enemy, unit.attackRange)
      .flatMap(c => reach.get(cellKey(c.x, c.y, ctx.width)) ?? [])
      .sort((a, b) => a.cost - b.cost)[0];
    if (cell) {
      return [
        moveTo(ruleId, unit, cell, score - 10, `${reason}: подхожу`, {
          basis: { x: enemy.x, y: enemy.y },
        }),
      ];
    }
  }
  return [];
};

/** C01: рабочие врага без защиты — ограниченный рейд. */
export const C01: AiRule = {
  id: 'C01',
  group: 'attack',
  title: 'Рейд по рабочим',
  evaluate: ctx => {
    const prey = ctx.enemies.filter(
      e => e.kind === 'unit' && !e.armed && unguarded(ctx, e),
    );
    if (!prey.length) return [];
    return riders(ctx).flatMap(unit =>
      raid(ctx, 'C01', unit, prey, 70, 'рейд по рабочим'),
    );
  },
};

/** C02: у врага открытый фланг — атаковать стрелков, лекаря и осаду. */
export const C02: AiRule = {
  id: 'C02',
  group: 'attack',
  title: 'Удар во фланг',
  evaluate: ctx => {
    const soft = ctx.enemies.filter(
      e =>
        ['ranged', 'siege'].includes(getTargetCategory(e.type)) &&
        !ctx.enemies.some(
          guard =>
            guard.type === 'spearman' && manhattan(guard, e) <= guard.move,
        ),
    );
    if (!soft.length) return [];
    return riders(ctx).flatMap(unit =>
      raid(ctx, 'C02', unit, soft, 72, 'бью стрелка или осаду во фланг'),
    );
  },
};

/** C03: быстрый враг идёт к своей экономике — перехватить. */
export const C03: AiRule = {
  id: 'C03',
  group: 'defense',
  title: 'Перехват быстрого врага',
  evaluate: ctx => {
    const economy = [
      ...ctx.workers,
      ...ctx.obs.ownBuildings.filter(({ role }) => role === 'resource'),
    ];
    const raiders = ctx.enemies.filter(
      e =>
        e.armed &&
        e.move >= 5 &&
        e.type !== 'griffon' &&
        economy.some(p => ctx.reaches(e, p, 1)),
    );
    if (!raiders.length) return [];
    return riders(ctx).flatMap(unit =>
      raid(ctx, 'C03', unit, raiders, 78, 'перехватываю налёт на экономику'),
    );
  },
};

/** C04: ослабленный враг отступает — добить в пределах безопасного хода. */
export const C04: AiRule = {
  id: 'C04',
  group: 'attack',
  title: 'Преследование',
  evaluate: ctx => {
    const weak = ctx.enemies.filter(
      e => e.kind === 'unit' && e.hp <= e.maxHp * 0.4 && e.type !== 'griffon',
    );
    if (!weak.length) return [];
    return riders(ctx).flatMap(unit => {
      if (unit.hp <= unit.maxHp * ctx.config.lowHp) return [];
      const safe = weak.filter(e => meleeThreat(ctx, e) <= 1);
      return raid(ctx, 'C04', unit, safe, 66, 'добиваю отступающего');
    });
  },
};
