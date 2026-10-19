import type { Position } from '@shared/config';
import { getTargetCategory } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { nearest } from '../facts';
import { manhattan } from '../geometry';
import { stepToward } from '../movement';
import { garrisonUnits } from '../operation';
import { bestMove, liveTargets, moveTo } from './common';
import {
  approachEnemy,
  cellsNear,
  assault,
  inGroup,
  retreat,
  strikeBest,
  unitsOf,
} from './roleKit';
import { targetValue } from './soldiers';

const spearmen = (ctx: AiContext) => unitsOf(ctx, 'spearman');

/** Видимая вражеская конница. */
const cavalry = (ctx: AiContext) =>
  ctx.enemies.filter(e => getTargetCategory(e.type) === 'cavalry');

/** P01: видна опасная конница — перехватить её вместо обычной цели. */
export const P01: AiRule = {
  id: 'P01',
  group: 'defense',
  title: 'Перехват конницы',
  evaluate: ctx => {
    const riders = cavalry(ctx);
    if (!riders.length) return [];
    const garrison = new Set(garrisonUnits(ctx).map(({ id }) => id));
    return spearmen(ctx).flatMap((unit): Candidate[] => {
      const hit = strikeBest(
        ctx,
        'P01',
        unit,
        e => 40 - e.hp / 10,
        70,
        'бью конницу',
        e => getTargetCategory(e.type) === 'cavalry',
      );
      if (hit.length) return hit;
      const rider = nearest(unit, riders)!;
      // Далёкая конница — не повод бросать строй.
      if (manhattan(unit, rider) > unit.maxMovePoints + rider.move) return [];
      // Гарнизон перехватывает только у базы: приманка его не уводит (P03).
      if (
        garrison.has(unit.id) &&
        (!ctx.base || manhattan(rider, ctx.base) > ctx.config.alertRadius)
      )
        return [];
      return approachEnemy(ctx, 'P01', unit, rider, 60, 'перехватываю конницу');
    });
  },
};

/** Свои уязвимые к коннице: стрелки, маг, лекарь, осада. */
const wards = (ctx: AiContext) =>
  ctx.military.filter(unit =>
    ['archer', 'mage', 'healer', 'siege'].includes(unit.type),
  );

/** P02: коннице доступны свои стрелки или осада — встать между ними. */
export const P02: AiRule = {
  id: 'P02',
  group: 'defense',
  title: 'Заслон от конницы',
  evaluate: ctx => {
    const riders = cavalry(ctx);
    const exposed = wards(ctx).filter(ward =>
      riders.some(r => manhattan(r, ward) <= r.move + 1),
    );
    if (!exposed.length) return [];
    return spearmen(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0 || liveTargets(ctx, unit).length) return [];
      const ward = nearest(unit, exposed)!;
      const rider = nearest(ward, riders)!;
      if (manhattan(unit, ward) <= 1) return [];
      const cell = bestMove(ctx, unit, c =>
        manhattan(c, ward) <= 1
          ? 100 - manhattan(c, rider)
          : -manhattan(c, ward),
      );
      return cell
        ? [moveTo('P02', unit, cell, 65, 'прикрываю от конницы')]
        : [];
    });
  },
};

/**
 * Пост у прохода: клетка в двух шагах от ратуши в сторону известной
 * угрозы. Без направления угрозы поста нет.
 */
const post = (ctx: AiContext): Position | null => {
  const { base } = ctx;
  const threat =
    base &&
    nearest(
      base,
      [...ctx.enemies, ...ctx.remembered].filter(e => e.armed),
    );
  if (!base || !threat) return null;
  return (
    cellsNear(ctx, base, 2)
      .filter(
        c =>
          manhattan(c, base) === 2 &&
          // Свой копейщик на посту его не занимает: иначе пост меняется.
          (!ctx.occupied(c.x, c.y) ||
            ctx.military.some(
              u => u.type === 'spearman' && u.x === c.x && u.y === c.y,
            )),
      )
      .sort((a, b) => manhattan(a, threat) - manhattan(b, threat))[0] ?? null
  );
};

/**
 * P03: подход к базе уязвим — копейщик гарнизона держит пост и не
 * преследует приманку дальше трёх клеток от него.
 */
export const P03: AiRule = {
  id: 'P03',
  group: 'defense',
  title: 'Удержание подхода',
  evaluate: ctx => {
    const spot = post(ctx);
    if (!spot) return [];
    const garrison = new Set(garrisonUnits(ctx).map(({ id }) => id));
    return spearmen(ctx)
      .filter(unit => garrison.has(unit.id))
      .flatMap((unit): Candidate[] => {
        const hit = strikeBest(
          ctx,
          'P03',
          unit,
          e => targetValue(ctx, e, unit),
          60,
          'держу подход',
          e => manhattan(e, spot) <= 3,
        );
        if (hit.length) return hit;
        if (manhattan(unit, spot) === 0) return [];
        const step = stepToward(ctx, unit, [spot]);
        return step
          ? [
              moveTo('P03', unit, step.next, 42, 'занимаю проход', {
                basis: { x: spot.x, y: spot.y },
              }),
            ]
          : [];
      });
  },
};

/** P04: срочной защиты нет — идти с группой и бить доступную цель. */
export const P04: AiRule = {
  id: 'P04',
  group: 'attack',
  title: 'Копейщик в группе',
  evaluate: ctx =>
    spearmen(ctx)
      .filter(unit => inGroup(ctx, unit))
      .flatMap((unit): Candidate[] => {
        const hit = strikeBest(
          ctx,
          'P04',
          unit,
          (e: EnemyView) => targetValue(ctx, e, unit),
          55,
          'атакую цель группы',
        );
        return hit.length ? hit : assault(ctx, 'P04', unit, 36);
      }),
};

/** P05: окружение или мало HP — отойти к прикрытию. */
export const P05: AiRule = {
  id: 'P05',
  group: 'defense',
  title: 'Отход копейщика',
  evaluate: ctx =>
    spearmen(ctx).flatMap(unit => {
      const adjacent = ctx.enemies.filter(
        e => e.armed && manhattan(e, unit) <= 1,
      ).length;
      const weak = unit.hp <= unit.maxHp * ctx.config.lowHp;
      if (!weak && adjacent < 2) return [];
      // Отход невозможен — копейщик остаётся держать проход.
      return retreat(ctx, 'P05', unit, 82, 'окружён или ранен: отхожу');
    }),
};
