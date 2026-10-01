import { MOVE_COST, type Position } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { ownArmor } from '../composition';
import { nearest } from '../facts';
import { manhattan, sides, tieBreak } from '../geometry';
import { garrisonUnits } from '../operation';
import { bestMove, liveTargets, moveTo } from './common';
import { unitsOf } from './roleKit';
import { buildStep, continueBuilds, siteOk } from './building';
import { nearestIdleWorker } from './builders';
import { hasTask } from './construction';

/**
 * P06 (Строй): копейщик без соседа-копейщика встаёт рядом с ближайшим,
 * если дойдёт за ход и сейчас не бьёт: пара получает +2 защиты.
 * Гарнизон держит свой пост (P03).
 */
export const P06: AiRule = {
  id: 'P06',
  group: 'defense',
  title: 'Строй копейщиков',
  evaluate: ctx => {
    if (!ctx.obs.researched.includes('formation')) return [];
    const garrison = new Set(garrisonUnits(ctx).map(({ id }) => id));
    return unitsOf(ctx, 'spearman').flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0 || garrison.has(unit.id)) return [];
      if (unit.hp <= unit.maxHp * ctx.config.lowHp) return [];
      if (ownArmor(ctx, unit) > 0 || liveTargets(ctx, unit).length) return [];
      const mate = nearest(
        unit,
        ctx.military.filter(
          ({ id, type }) => type === 'spearman' && id !== unit.id,
        ),
      );
      if (!mate) return [];
      // Ради Строя не входить под угрозу больше текущей.
      const risk = ctx.threatAt(unit, 'spearman');
      const cell = bestMove(ctx, unit, c => {
        const threat = ctx.threatAt(c, 'spearman');
        return manhattan(c, mate) === 1 && threat <= risk ? 100 - threat : -1e6;
      });
      return cell
        ? [
            moveTo('P06', unit, cell, 40, 'встаю в строй с копейщиком', {
              basis: { x: mate.x, y: mate.y },
            }),
          ]
        : [];
    });
  },
};

/** Сколько сторон клетки непроходимы по известной карте: узость прохода. */
const narrowness = (ctx: AiContext, cell: Position) =>
  sides(cell).filter(side => {
    if (!ctx.inside(side)) return true;
    const type = ctx.known(side.x, side.y);
    const building = ctx.obs.ownBuildings.some(
      b => b.x === side.x && b.y === side.y,
    );
    return building || (!!type && MOVE_COST[type] === undefined);
  }).length;

/**
 * Площадка частокола: узкий проход (две непроходимые стороны) между
 * базой и известной угрозой, ближе к стрелкам и башням. Последний выход
 * не перекрывается — это проверяет `siteOk`.
 */
export const palisadeSite = (
  ctx: AiContext,
  threat: Position,
): Position | null => {
  const { base } = ctx;
  if (!base) return null;
  const guards = [...ctx.military, ...ctx.obs.ownBuildings].filter(({ type }) =>
    ['archer', 'tower', 'siege', 'mage'].includes(type),
  );
  let best: Position | null = null;
  let bestScore = -Infinity;
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const cell = { x: base.x + dx, y: base.y + dy };
      const distance = manhattan(cell, base);
      if (distance < 2 || distance > 5) continue;
      if (manhattan(cell, threat) >= manhattan(base, threat)) continue;
      const narrow = narrowness(ctx, cell);
      if (narrow < 2 || !siteOk(ctx, 'palisade', cell)) continue;
      const covers = guards.some(g => manhattan(g, cell) <= 2) ? 5 : 0;
      const score =
        narrow * 10 +
        covers -
        distance -
        tieBreak(`palisade:${cell.x},${cell.y}`, ctx.memory.seed);
      if (score > bestScore) {
        best = cell;
        bestScore = score;
      }
    }
  }
  return best;
};

/**
 * W11 (Инженерия): известна угроза — поставить частокол в узком проходе
 * к базе, прикрывая стрелков и башни. Не больше двух частоколов.
 */
export const W11: AiRule = {
  id: 'W11',
  group: 'build',
  title: 'Частокол в проходе',
  evaluate: ctx => {
    const continued = continueBuilds(ctx, 'W11', 'build', 50);
    if (continued.length) return continued;
    const { base } = ctx;
    if (!ctx.obs.researched.includes('engineering') || !base) return [];
    if (hasTask(ctx, 'W11')) return [];
    const walls = ctx.obs.ownBuildings.filter(
      ({ type }) => type === 'palisade',
    ).length;
    if (walls >= 2) return [];
    const threat = nearest(
      base,
      [...ctx.enemies, ...ctx.remembered].filter(
        ({ armed, kind }) => armed && kind === 'unit',
      ),
    );
    if (!threat || manhattan(threat, base) > ctx.config.alertRadius * 2) {
      return [];
    }
    const site = palisadeSite(ctx, threat);
    const worker = site && nearestIdleWorker(ctx, site);
    if (!site || !worker) return [];
    return buildStep(
      ctx,
      'W11',
      'build',
      worker,
      'palisade',
      site,
      45,
      'частокол в узком проходе к базе',
    );
  },
};
