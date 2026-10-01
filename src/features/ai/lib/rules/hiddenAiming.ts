import type { AiRule, Candidate } from '../../model/types';
import { nearest } from '../facts';
import { manhattan } from '../geometry';
import { strikeGroup } from '../operation';
import { bestMove, moveTo, taskOf } from './common';
import { guns, hitsOwn, inStrikeRange } from './siege';
import { SCOUT_SIGHT, scouts } from './scouts';

/**
 * O07 (Скрытая наводка): враг увидит отметку, только если его разведчик
 * видит цель. Без видимого вражеского разведчика рядом — готовить удар по
 * скоплению: клетке видимого врага, у которого больше всего соседей.
 */
export const O07: AiRule = {
  id: 'O07',
  group: 'attack',
  title: 'Скрытый удар по скоплению',
  evaluate: ctx => {
    if (!ctx.obs.researched.includes('hiddenAiming')) return [];
    const foes = ctx.enemies.filter(
      ({ kind, type }) => kind === 'unit' && type !== 'griffon',
    );
    const spotters = ctx.enemies.filter(({ type }) => type === 'scout');
    return guns(ctx).flatMap((unit): Candidate[] => {
      const target = foes
        .filter(
          foe =>
            inStrikeRange(ctx, unit, foe) &&
            !hitsOwn(ctx, foe) &&
            !ctx.struck(foe) &&
            !spotters.some(scout => manhattan(scout, foe) <= SCOUT_SIGHT),
        )
        .map(foe => ({
          foe,
          crowd: foes.filter(other => manhattan(other, foe) <= 1).length,
        }))
        .sort((a, b) => b.crowd - a.crowd)[0];
      if (!target || target.crowd < 2) return [];
      const { foe, crowd } = target;
      return [
        {
          ruleId: 'O07',
          group: 'attack',
          actorId: unit.id,
          action: {
            type: 'prepareStrike',
            unitId: unit.id,
            x: foe.x,
            y: foe.y,
          },
          score: 55 + crowd * 5,
          reason: 'скрытый удар: рядом нет вражеского разведчика',
          basis: { x: foe.x, y: foe.y, crowd },
        },
      ];
    });
  },
};

/**
 * R07: у врага есть осада — один разведчик держится у своих войск. Со
 * Скрытой наводкой врага отметку по ним видно только в обзоре разведчика.
 */
export const R07: AiRule = {
  id: 'R07',
  group: 'scout',
  title: 'Разведчик у своих против осады',
  evaluate: ctx => {
    const siege = [...ctx.enemies, ...ctx.remembered].some(
      ({ type }) => type === 'siege',
    );
    if (!siege) return [];
    const troops = (units: typeof ctx.military) =>
      units.filter(({ type }) => type !== 'scout');
    const group = troops(strikeGroup(ctx));
    const anchor = group.length ? group : troops(ctx.military);
    const unit = scouts(ctx).find(
      scout => scout.movePoints > 0 && !taskOf(ctx, scout.id),
    );
    const near = unit && nearest(unit, anchor);
    if (!unit || !near || manhattan(unit, near) <= 2) return [];
    const cell = bestMove(
      ctx,
      unit,
      c => -ctx.threatAt(c, 'scout') * 10 - manhattan(c, near),
    );
    return cell
      ? [
          moveTo('R07', unit, cell, 40, 'держусь у своих: у врага осада', {
            basis: { x: near.x, y: near.y },
          }),
        ]
      : [];
  },
};
