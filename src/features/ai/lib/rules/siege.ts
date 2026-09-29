import {
  SIEGE_STRIKE,
  type BuildingType,
  type MilitaryUnit,
  type Position,
} from '@shared/config';
import { isFlyingType } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { enemyTarget, nearest } from '../facts';
import { manhattan } from '../geometry';
import { pathCost } from './clearing';
import { bestMove, meleeThreat, moveTo } from './common';
import { coverUnits, hasCover, unitsOf } from './roleKit';

/** Орудия, которые ещё могут подготовить удар. */
export const guns = (ctx: AiContext) =>
  unitsOf(ctx, 'siege').filter(
    unit => unit.attackPoints > 0 && !unit.preparedStrike,
  );

/** Клетка в дальности удара и разведана: иначе команда откажет. */
export const inStrikeRange = (
  ctx: AiContext,
  from: Position,
  cell: Position,
) => {
  const distance = manhattan(from, cell);
  return (
    distance >= SIEGE_STRIKE.minRange &&
    distance <= SIEGE_STRIKE.maxRange &&
    !!ctx.known(cell.x, cell.y)
  );
};

/** Важность здания для штурма: оборона, производство, ратуша. */
const WORTH: Partial<Record<BuildingType, number>> = {
  tower: 40,
  base: 35,
  barracks: 30,
  stable: 28,
  workshop: 28,
  sanctuary: 28,
};

/** Известные здания врага — неподвижные цели; юниты уйдут до удара (кроме O05). */
export const buildingTargets = (ctx: AiContext) =>
  [...ctx.enemies, ...ctx.remembered].filter(({ kind }) => kind === 'building');

/** Удар по клетке заденет своих: там свой юнит или здание. */
export const hitsOwn = (ctx: AiContext, cell: Position) =>
  [...ctx.obs.ownUnits, ...ctx.obs.ownBuildings].some(
    own => own.x === cell.x && own.y === cell.y,
  );

/** Ценность цели удара с учётом цели операции. */
const worth = (ctx: AiContext, target: EnemyView) => {
  const goal = ctx.memory.operation.target;
  const focus = goal && goal.x === target.x && goal.y === target.y ? 20 : 0;
  return (WORTH[target.type as BuildingType] ?? 15) + focus;
};

/** Все клетки кольца 2–5 вокруг орудия. */
const strikeArea = (from: Position): Position[] => {
  const cells: Position[] = [];
  const { minRange, maxRange } = SIEGE_STRIKE;
  for (let dy = -maxRange; dy <= maxRange; dy++) {
    for (let dx = -maxRange; dx <= maxRange; dx++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance >= minRange && distance <= maxRange)
        cells.push({ x: from.x + dx, y: from.y + dy });
    }
  }
  return cells;
};

const prepare = (
  ruleId: string,
  unit: MilitaryUnit,
  cell: Position,
  score: number,
  reason: string,
  basis: Candidate['basis'] = {},
): Candidate => ({
  ruleId,
  group: 'attack',
  actorId: unit.id,
  action: { type: 'prepareStrike', unitId: unit.id, x: cell.x, y: cell.y },
  score,
  reason,
  basis: { x: cell.x, y: cell.y, ...basis },
});

/**
 * O02: важное здание в дальности — подготовить по нему удар. Нужна
 * защита рядом либо отсутствие ближней угрозы; свои на клетке — отказ.
 */
export const O02: AiRule = {
  id: 'O02',
  group: 'attack',
  title: 'Удар по зданию',
  evaluate: ctx => {
    const targets = buildingTargets(ctx);
    if (!targets.length) return [];
    const marked = (p: Position) => ctx.struck(p);
    return guns(ctx).flatMap((unit): Candidate[] => {
      if (!hasCover(ctx, unit, unit) && meleeThreat(ctx, unit) > 0) return [];
      const target = targets
        .filter(
          t => inStrikeRange(ctx, unit, t) && !hitsOwn(ctx, t) && !marked(t),
        )
        .sort((a, b) => worth(ctx, b) - worth(ctx, a))[0];
      return target
        ? [
            prepare(
              'O02',
              unit,
              target,
              70 + worth(ctx, target) / 2,
              `готовлю удар по ${target.type}`,
              { target: target.type },
            ),
          ]
        : [];
    });
  },
};

/**
 * O05: подошёл мобильный враг — отступить к прикрытию; если отступить
 * некуда, законная защита — удар по клетке врага в дальности.
 */
export const O05: AiRule = {
  id: 'O05',
  group: 'defense',
  title: 'Защита орудия',
  evaluate: ctx =>
    unitsOf(ctx, 'siege').flatMap((unit): Candidate[] => {
      // Своё прикрытие рядом держит подход: орудие не бросает позицию.
      if (meleeThreat(ctx, unit) === 0 || hasCover(ctx, unit, unit)) return [];
      const cover = nearest(unit, coverUnits(ctx, unit)) ?? ctx.base;
      const cell = bestMove(
        ctx,
        unit,
        c => -meleeThreat(ctx, c) * 100 - (cover ? manhattan(c, cover) : 0),
      );
      if (cell && meleeThreat(ctx, cell) < meleeThreat(ctx, unit)) {
        return [moveTo('O05', unit, cell, 90, 'враг рядом: отступаю')];
      }
      if (unit.attackPoints <= 0 || unit.preparedStrike) return [];
      const foe = ctx.enemies
        .filter(
          e =>
            e.armed &&
            e.kind === 'unit' &&
            !isFlyingType(e.type) && // удар воздух не задевает
            inStrikeRange(ctx, unit, e) &&
            !hitsOwn(ctx, e),
        )
        .sort((a, b) => manhattan(a, unit) - manhattan(b, unit))[0];
      return foe
        ? [prepare('O05', unit, foe, 70, 'отступать некуда: бью по подходу')]
        : [];
    }),
};

/**
 * O06: цель разрушена или скрылась, проход закрыт — переоценить. Пока
 * здания в памяти нет, орудие идёт с группой (O01), разведку ведут
 * R/G05; лес на пути к цели, заметно сокращающий обход, — подготовить
 * удар: удар расчищает лес (расчистка осадой).
 */
export const O06: AiRule = {
  id: 'O06',
  group: 'attack',
  title: 'Переоценка цели осады',
  evaluate: ctx => {
    const goal = ctx.memory.operation.target ?? enemyTarget(ctx);
    if (!goal || buildingTargets(ctx).length) return [];
    return guns(ctx).flatMap((unit): Candidate[] => {
      const start = ctx.base ?? unit;
      const before = pathCost(ctx, start, goal);
      for (const cell of strikeArea(unit)) {
        if (ctx.known(cell.x, cell.y) !== 'forest') continue;
        if (!ctx.obs.visible[cell.y]?.[cell.x] || hitsOwn(ctx, cell)) continue;
        const after = pathCost(ctx, start, goal, cell);
        if (before - after >= ctx.config.clearingGain) {
          return [
            prepare('O06', unit, cell, 40, 'расчищаю проход ударом', {
              gain: before === Infinity ? 'проход' : before - after,
            }),
          ];
        }
      }
      return [];
    });
  },
};
