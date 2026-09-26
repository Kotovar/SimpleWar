import type { Position } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import { nearest } from '../facts';
import { manhattan } from '../geometry';
import { stepToward, turnMoves } from '../movement';
import { strikeGroup } from '../operation';
import {
  bestMove,
  canAttack,
  isDoomed,
  liveTargets,
  meleeThreat,
  moveTo,
} from './common';
import { archers } from './archers';

/** A01: до атаки занять дальнюю огневую клетку вне ближней угрозы. */
export const A01: AiRule = {
  id: 'A01',
  group: 'attack',
  title: 'Огневая позиция',
  evaluate: ctx =>
    archers(ctx).flatMap((unit): Candidate[] => {
      if (!canAttack(unit) || unit.movePoints <= 0) return [];
      if (liveTargets(ctx, unit).length) return [];
      let best: Position | null = null;
      let bestScore = -Infinity;
      for (const cell of turnMoves(ctx, unit)) {
        const target = nearest(
          cell,
          ctx.enemies.filter(e => !isDoomed(ctx, e)),
        );
        if (!target || manhattan(cell, target) > unit.attackRange) continue;
        const score = manhattan(cell, target) * 3 - meleeThreat(ctx, cell) * 10;
        if (score > bestScore) {
          best = cell;
          bestScore = score;
        }
      }
      return best
        ? [
            moveTo('A01', unit, best, 55, 'занимаю огневую позицию', {
              group: 'attack',
            }),
          ]
        : [];
    }),
};

/** A04: своя пехота наступает — держаться позади неё. */
export const A04: AiRule = {
  id: 'A04',
  group: 'attack',
  title: 'За прикрытием',
  evaluate: ctx => {
    const { phase, target } = ctx.memory.operation;
    if ((phase !== 'advance' && phase !== 'engage') || !target) return [];
    const group = strikeGroup(ctx);
    const members = new Set(group.map(({ id }) => id));
    const cover = group.filter(({ type }) => type === 'swordsman');
    return archers(ctx)
      .filter(unit => members.has(unit.id) && unit.movePoints > 0)
      .flatMap((unit): Candidate[] => {
        if (liveTargets(ctx, unit).length) return [];
        const front = nearest(target, cover);
        if (!front) {
          const step = stepToward(ctx, unit, [target]);
          return step
            ? [
                moveTo('A04', unit, step.next, 35, 'иду с группой', {
                  group: 'attack',
                }),
              ]
            : [];
        }
        const line = manhattan(front, target);
        const cell = bestMove(ctx, unit, c => {
          const behind = manhattan(c, target) > line ? 0 : -50;
          return behind - Math.abs(manhattan(c, front) - 2);
        });
        return cell
          ? [
              moveTo('A04', unit, cell, 40, 'держусь за пехотой', {
                group: 'attack',
              }),
            ]
          : [];
      });
  },
};

/** A06: цель скрылась — сменить позицию по последнему контакту без стрельбы. */
export const A06: AiRule = {
  id: 'A06',
  group: 'attack',
  title: 'К последнему контакту',
  evaluate: ctx => {
    if (ctx.enemies.length) return [];
    const contacts = ctx.remembered.filter(
      ({ kind, certainty }) => kind === 'unit' && certainty > 0,
    );
    return archers(ctx).flatMap((unit): Candidate[] => {
      const contact = nearest(unit, contacts);
      if (!contact || manhattan(contact, unit) > 8 || unit.movePoints <= 0)
        return [];
      const step = stepToward(ctx, unit, [contact]);
      return step
        ? [
            moveTo('A06', unit, step.next, 25, 'иду к последнему месту врага', {
              group: 'attack',
              basis: { x: contact.x, y: contact.y },
            }),
          ]
        : [];
    });
  },
};
