import type { AiRule, Candidate } from '../../model/types';
import { enemyTarget, nearest } from '../facts';
import { manhattan, tieBreak } from '../geometry';
import { strikeGroup } from '../operation';
import { bestMove, moveTo, taskOf } from './common';
import { cellsNear, unitsOf } from './roleKit';
import { SCOUT_SIGHT, scoutTo, scouts } from './scouts';

/**
 * R04: видна вражеская группа — держаться на краю обзора, вне её удара.
 * Отметка удара у своих зданий без видимого орудия — наблюдать кольцо
 * 2–5 вокруг неё: так обзор покрывает место Скрытой наводки.
 */
export const R04: AiRule = {
  id: 'R04',
  group: 'scout',
  title: 'Наблюдение',
  evaluate: ctx => {
    const armed = ctx.enemies.filter(e => e.armed && e.kind === 'unit');
    const siegeSeen = ctx.enemies.some(({ type }) => type === 'siege');
    const marks = siegeSeen
      ? []
      : ctx.obs.strikes.filter(mark =>
          ctx.obs.ownBuildings.some(b => manhattan(b, mark) <= 6),
        );
    if (!marks.length && armed.length < 2) return [];
    return scouts(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0 || taskOf(ctx, unit.id)) return [];
      const mark = nearest(unit, marks);
      if (mark) {
        const cell = bestMove(
          ctx,
          unit,
          c =>
            -ctx.threatAt(c, 'scout') * 10 - Math.abs(manhattan(c, mark) - 2),
        );
        return cell
          ? [
              moveTo('R04', unit, cell, 55, 'слежу за местом наводки', {
                basis: { x: mark.x, y: mark.y },
              }),
            ]
          : [];
      }
      const group = nearest(unit, armed)!;
      const safe = Math.max(...armed.map(e => e.move + e.range)) + 1;
      const cell = bestMove(
        ctx,
        unit,
        c =>
          -ctx.threatAt(c, 'scout') * 10 -
          Math.abs(manhattan(c, group) - Math.min(safe, SCOUT_SIGHT)),
      );
      return cell
        ? [
            moveTo('R04', unit, cell, 44, 'наблюдаю за группой врага', {
              basis: { x: group.x, y: group.y, foes: armed.length },
            }),
          ]
        : [];
    });
  },
};

/** R05: готовится наступление — проверить фланг цели вне видимости. */
export const R05: AiRule = {
  id: 'R05',
  group: 'scout',
  title: 'Проверка фланга',
  evaluate: ctx => {
    const { phase, target } = ctx.memory.operation;
    const goal = enemyTarget(ctx) ?? target;
    if (!goal || (phase !== 'gather' && phase !== 'advance')) return [];
    const group = strikeGroup(ctx);
    const center = nearest(goal, group);
    return scouts(ctx).flatMap(unit => {
      if (unit.movePoints <= 0 || taskOf(ctx, unit.id)) return [];
      // Фланг: клетка у цели, не видимая сейчас и в стороне от группы.
      const flank = cellsNear(ctx, goal, 5)
        .filter(
          c =>
            manhattan(c, goal) >= 4 &&
            !ctx.obs.visible[c.y]?.[c.x] &&
            ctx.threatAt(c, 'scout') === 0,
        )
        .sort(
          (a, b) =>
            (center ? manhattan(b, center) - manhattan(a, center) : 0) ||
            tieBreak(`${a.x},${a.y}`, ctx.memory.seed) -
              tieBreak(`${b.x},${b.y}`, ctx.memory.seed),
        )[0];
      return flank
        ? scoutTo(ctx, 'R05', unit, flank, 42, 'проверяю фланг', false)
        : [];
    });
  },
};

/** R06: разведчик под угрозой — уклониться, не размениваться на атаку. */
export const R06: AiRule = {
  id: 'R06',
  group: 'defense',
  title: 'Уклонение разведчика',
  evaluate: ctx =>
    unitsOf(ctx, 'scout').flatMap(unit => {
      const danger = ctx.threatAt(unit, 'scout');
      if (unit.movePoints <= 0 || danger === 0) return [];
      const cell = bestMove(ctx, unit, c => -ctx.threatAt(c, 'scout'));
      return cell
        ? [
            moveTo('R06', unit, cell, 90, 'опасность: ухожу', {
              basis: { threat: danger },
            }),
          ]
        : [];
    }),
};
