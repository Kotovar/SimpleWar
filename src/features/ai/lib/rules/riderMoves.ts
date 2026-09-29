import type { AiRule } from '../../model/types';
import { manhattan, tieBreak } from '../geometry';
import { stepToward } from '../movement';
import { bestMove, moveTo, taskOf } from './common';
import { assault, retreat } from './roleKit';
import { riders } from './riders';

/**
 * C05: боевой задачи нет — в группе бить доступную цель и наступать; вне
 * операции, если
 * сектор не разведан, быстро проверить ближний фланг у базы, не заменяя
 * разведчика: дальняя граница не берётся.
 */
export const C05: AiRule = {
  id: 'C05',
  group: 'scout',
  title: 'Проверка фланга всадником',
  evaluate: ctx => {
    const follow = riders(ctx).flatMap(unit => assault(ctx, 'C05', unit, 30));
    if (follow.length) return follow;
    const { base } = ctx;
    if (!base || ctx.enemies.length) return [];
    const flank = ctx.frontier.filter(
      c => manhattan(c, base) <= 10 && ctx.threatAt(c, 'rider') === 0,
    );
    if (!flank.length) return [];
    return riders(ctx).flatMap(unit => {
      if (unit.movePoints <= 0 || taskOf(ctx, unit.id)) return [];
      const goal = [...flank].sort(
        (a, b) =>
          manhattan(a, unit) - manhattan(b, unit) ||
          tieBreak(`${a.x},${a.y}`, ctx.memory.seed) -
            tieBreak(`${b.x},${b.y}`, ctx.memory.seed),
      )[0];
      const step = stepToward(ctx, unit, [goal]);
      return step ? [moveTo('C05', unit, step.next, 22, 'проверяю фланг')] : [];
    });
  },
};

/** C06: рядом копейщики, башня или мало HP — разорвать контакт. */
export const C06: AiRule = {
  id: 'C06',
  group: 'defense',
  title: 'Разрыв контакта',
  evaluate: ctx =>
    riders(ctx).flatMap(unit => {
      const spears = ctx.enemies.some(
        e => e.type === 'spearman' && manhattan(e, unit) <= e.move + 1,
      );
      const tower = ctx.enemies.some(
        e => e.type === 'tower' && manhattan(e, unit) <= e.range,
      );
      const weak = unit.hp <= unit.maxHp * ctx.config.lowHp;
      if (!spears && !tower && !weak) return [];
      const cell = bestMove(
        ctx,
        unit,
        c =>
          -ctx.threatAt(c, 'rider') * 10 -
          ctx.enemies.filter(
            e => e.type === 'spearman' && manhattan(e, c) <= e.move + 1,
          ).length *
            100,
      );
      return cell
        ? [
            moveTo('C06', unit, cell, 88, 'опасный контакт: отрываюсь', {
              basis: { hp: unit.hp },
            }),
          ]
        : retreat(ctx, 'C06', unit, 88, 'опасный контакт: отрываюсь');
    }),
};
