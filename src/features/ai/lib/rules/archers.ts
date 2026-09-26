import type { Position } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { baseAlarm } from '../facts';
import { manhattan } from '../geometry';
import {
  attackOf,
  bestMove,
  canAttack,
  isDoomed,
  isFree,
  isKillable,
  liveTargets,
  meleeThreat,
  moveTo,
} from './common';

/** Лучники, ещё действующие в этом ходу. */
export const archers = (ctx: AiContext) =>
  ctx.military.filter(unit => unit.type === 'archer' && isFree(ctx, unit.id));

/** Предпочтение целей лучника: опасный стрелок > пехота > безоружные. */
const preference = (enemy: EnemyView) =>
  (enemy.armed ? 20 : 0) +
  (enemy.range > 1 ? 15 : 0) +
  enemy.attack -
  enemy.hp / 20;

/** A02: доступна опасная добиваемая цель — завершить её уничтожение. */
export const A02: AiRule = {
  id: 'A02',
  group: 'attack',
  title: 'Добивание',
  evaluate: ctx =>
    archers(ctx).flatMap((unit): Candidate[] => {
      if (!canAttack(unit)) return [];
      const target = liveTargets(ctx, unit).find(
        enemy => enemy.armed && isKillable(ctx, enemy, unit.attack),
      );
      return target
        ? [attackOf('A02', unit, target, 90, 'добиваю опасную цель')]
        : [];
    }),
};

/** A03: несколько целей — стрелять по уязвимому опасному стрелку/пехоте. */
export const A03: AiRule = {
  id: 'A03',
  group: 'attack',
  title: 'Выбор цели лучником',
  evaluate: ctx =>
    archers(ctx).flatMap((unit): Candidate[] => {
      if (!canAttack(unit)) return [];
      const target = [...liveTargets(ctx, unit)].sort(
        (a, b) => preference(b) - preference(a),
      )[0];
      return target
        ? [
            attackOf(
              'A03',
              unit,
              target,
              60 + preference(target) / 2,
              'стреляю по приоритетной цели',
            ),
          ]
        : [];
    }),
};

/** A05: база или рабочий под атакой — оборонительный огонь. */
export const A05: AiRule = {
  id: 'A05',
  group: 'defense',
  title: 'Оборонительный огонь',
  evaluate: ctx => {
    const attackers = [
      ...baseAlarm(ctx),
      ...ctx.enemies.filter(
        enemy =>
          enemy.armed &&
          ctx.workers.some(w => manhattan(w, enemy) <= enemy.range + 1),
      ),
    ];
    if (!attackers.length) return [];
    return archers(ctx).flatMap((unit): Candidate[] => {
      if (!canAttack(unit)) return [];
      const target = attackers.find(
        enemy =>
          manhattan(enemy, unit) <= unit.attackRange && !isDoomed(ctx, enemy),
      );
      if (target) {
        return [
          {
            ...attackOf('A05', unit, target, 95, 'защищаю базу и рабочих'),
            group: 'defense',
          },
        ];
      }
      const cell = bestMove(ctx, unit, c =>
        attackers.some(e => manhattan(e, c) <= unit.attackRange)
          ? 50 - meleeThreat(ctx, c) * 10
          : -manhattan(c, attackers[0]),
      );
      return cell
        ? [
            moveTo('A05', unit, cell, 70, 'выхожу на оборонительный огонь', {
              group: 'defense',
            }),
          ]
        : [];
    });
  },
};

/**
 * A07: ближний враг рядом или мало HP — отойти вместо выстрела. Если
 * уйти из-под удара нельзя, лучник отступает на свою дальность: пехоте
 * придётся потратить ход на сближение, а выстрел остаётся.
 */
export const A07: AiRule = {
  id: 'A07',
  group: 'defense',
  title: 'Отход лучника',
  evaluate: ctx =>
    archers(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0 || !canAttack(unit)) return [];
      const melee = ctx.enemies.filter(
        enemy => enemy.armed && enemy.range <= 1,
      );
      const adjacent = melee.some(enemy => manhattan(enemy, unit) <= 1);
      const weak =
        unit.hp <= unit.maxHp * ctx.config.lowHp && ctx.threatAt(unit) > 0;
      if (!adjacent && !weak) return [];
      const gap = (c: Position) =>
        Math.min(unit.attackRange, ...melee.map(enemy => manhattan(enemy, c)));
      const value = (c: Position) =>
        -(meleeThreat(ctx, c) * 10 + ctx.threatAt(c)) * 10 + gap(c);
      const cell = bestMove(ctx, unit, value);
      if (!cell) return [];
      return [
        moveTo('A07', unit, cell, 92, 'отхожу вместо выстрела', {
          group: 'defense',
        }),
      ];
    }),
};
