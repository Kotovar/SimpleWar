import type { Position, UnitType } from '@shared/config';
import { isFlyingType } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { baseAlarm, nearest } from '../facts';
import { manhattan } from '../geometry';
import { stepToward } from '../movement';
import { damageTo, isDoomed, isKillable, meleeThreat, moveTo } from './common';
import {
  approachEnemy,
  cellsNear,
  coverUnits,
  followGroup,
  hasCover,
  retreat,
  strikeBest,
  unitsOf,
} from './roleKit';

const mages = (ctx: AiContext) => unitsOf(ctx, 'mage');

/** Цели, по которым магия заметно действует: здания держат её хорошо. */
const MIN_DAMAGE = 12;

/**
 * Польза магического удара: урон после сопротивления, добивание и
 * опасность цели. Высокая защита снижает ценность сама.
 */
const value = (
  ctx: AiContext,
  mage: { type: UnitType; attack: number },
  enemy: EnemyView,
) =>
  damageTo(mage, enemy) +
  (isKillable(ctx, enemy, mage) ? 30 : 0) +
  (enemy.armed ? enemy.attack : 0);

/** K01: есть видимая цель — выбрать по ожидаемому магическому урону. */
export const K01: AiRule = {
  id: 'K01',
  group: 'attack',
  title: 'Магическая атака',
  evaluate: ctx =>
    mages(ctx).flatMap(unit =>
      strikeBest(
        ctx,
        'K01',
        unit,
        e => value(ctx, unit, e),
        50,
        'бью магией',
        e => damageTo(unit, e) >= MIN_DAMAGE,
      ),
    ),
};

/**
 * K02: цель вне дальности — подойти под прикрытием, вне ближнего удара;
 * целей не видно — идти с ударной группой.
 */
export const K02: AiRule = {
  id: 'K02',
  group: 'attack',
  title: 'Подход мага',
  evaluate: ctx => {
    const targets = ctx.enemies.filter(
      e => !isDoomed(ctx, e) && e.kind === 'unit',
    );
    if (!targets.length)
      return mages(ctx).flatMap(unit => followGroup(ctx, 'K02', unit, 30));
    return mages(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0 || unit.attackPoints <= 0) return [];
      const worth = targets.filter(e => damageTo(unit, e) >= MIN_DAMAGE);
      if (worth.some(e => manhattan(e, unit) <= unit.attackRange)) return [];
      const target = nearest(unit, worth);
      if (!target) return [];
      // Ближний удар доступен врагу, если между ним и клеткой нет своего бойца.
      const screened = (c: Position) =>
        coverUnits(ctx, unit).some(
          u =>
            manhattan(u, c) <= 2 && manhattan(u, target) < manhattan(c, target),
        );
      const spots = cellsNear(ctx, target, unit.attackRange).filter(
        c =>
          manhattan(c, target) >= 2 &&
          (meleeThreat(ctx, c) === 0 || screened(c)) &&
          hasCover(ctx, c, unit),
      );
      const step = stepToward(ctx, unit, spots);
      return step
        ? [
            moveTo('K02', unit, step.next, 45, 'подхожу под прикрытием', {
              basis: { x: target.x, y: target.y },
            }),
          ]
        : [];
    });
  },
};

/** K03: воздух угрожает базе — бить его или выйти на позицию защиты. */
export const K03: AiRule = {
  id: 'K03',
  group: 'defense',
  title: 'Противовоздушная защита',
  evaluate: ctx => {
    const flyers = baseAlarm(ctx).filter(e => isFlyingType(e.type));
    if (!flyers.length) return [];
    const ids = new Set(flyers.map(({ id }) => id));
    return mages(ctx).flatMap(unit => {
      const hit = strikeBest(
        ctx,
        'K03',
        unit,
        e => value(ctx, unit, e),
        80,
        'бью воздух у базы',
        e => ids.has(e.id),
      );
      if (hit.length) return hit;
      return approachEnemy(
        ctx,
        'K03',
        unit,
        nearest(unit, flyers)!,
        65,
        'выхожу против воздуха',
      );
    });
  },
};

/** K04: маг уязвим или ранен — отойти, не преследуя. */
export const K04: AiRule = {
  id: 'K04',
  group: 'defense',
  title: 'Отход мага',
  evaluate: ctx =>
    mages(ctx).flatMap(unit => {
      const weak = unit.hp <= unit.maxHp * ctx.config.lowHp;
      if (!weak && meleeThreat(ctx, unit) === 0) return [];
      return retreat(ctx, 'K04', unit, 86, 'уязвим: отхожу');
    }),
};
