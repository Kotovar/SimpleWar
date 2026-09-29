import { HITS_AIR } from '@shared/config';
import { findCheapestPaths } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { baseAlarm, enemyTarget, nearest } from '../facts';
import { cellKey, manhattan, tieBreak } from '../geometry';
import { standCells, stepToward } from '../movement';
import { moveTo } from './common';
import {
  approachEnemy,
  assault,
  retreat,
  strikeBest,
  unitsOf,
} from './roleKit';

const griffons = (ctx: AiContext) => unitsOf(ctx, 'griffon');

/** Известная противовоздушная сила, достающая клетку в свой ход. */
const antiAir = (ctx: AiContext, cell: { x: number; y: number }) =>
  [...ctx.enemies, ...ctx.remembered].filter(
    e =>
      e.armed &&
      HITS_AIR.includes(e.type) &&
      manhattan(e, cell) <= e.move + e.range,
  );

/**
 * F01: наземный путь к границе долгий — разведать воздухом. Цель —
 * граница, до которой по земле нет пути или он вдвое длиннее прямой;
 * невидимое не раскрывается заранее: юнит летит к известной границе.
 * В операции грифон бьёт цель в дальности и наступает на цель группы.
 */
export const F01: AiRule = {
  id: 'F01',
  group: 'scout',
  title: 'Воздушная разведка',
  evaluate: ctx => {
    const follow = griffons(ctx).flatMap(unit => assault(ctx, 'F01', unit, 30));
    if (follow.length) return follow;
    const { base } = ctx;
    if (!base || enemyTarget(ctx) || ctx.enemies.length) return [];
    const start = standCells(ctx, base)[0];
    if (!start) return [];
    const ground = findCheapestPaths(ctx.grid(2), start);
    const long = ctx.frontier.filter(c => {
      const cost = ground.cost.get(cellKey(c.x, c.y, ground.width));
      return (
        (cost === undefined || cost >= manhattan(c, base) * 2) &&
        antiAir(ctx, c).length === 0
      );
    });
    if (!long.length) return [];
    return griffons(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0) return [];
      const goal = [...long].sort(
        (a, b) =>
          manhattan(a, unit) - manhattan(b, unit) ||
          tieBreak(`${a.x},${a.y}`, ctx.memory.seed) -
            tieBreak(`${b.x},${b.y}`, ctx.memory.seed),
      )[0];
      const step = stepToward(ctx, unit, [goal]);
      return step
        ? [
            moveTo('F01', unit, step.next, 40, 'разведываю по воздуху', {
              basis: { x: goal.x, y: goal.y },
            }),
          ]
        : [];
    });
  },
};

/** Незащищённая экономика врага: рабочие и добыча без известной ПВО. */
const exposedEconomy = (ctx: AiContext): EnemyView[] =>
  ctx.enemies
    .filter(
      e =>
        (!e.armed && e.kind === 'unit') ||
        e.type === 'mine' ||
        e.type === 'sawmill',
    )
    .filter(e => antiAir(ctx, e).length === 0);

/** F02: видна незащищённая экономика — рейд с учётом ПВО. */
export const F02: AiRule = {
  id: 'F02',
  group: 'attack',
  title: 'Воздушный рейд',
  evaluate: ctx => {
    const prey = exposedEconomy(ctx);
    if (!prey.length) return [];
    const ids = new Set(prey.map(({ id }) => id));
    return griffons(ctx).flatMap((unit): Candidate[] => {
      const hit = strikeBest(
        ctx,
        'F02',
        unit,
        e => (e.kind === 'unit' ? 30 : 15) - e.hp / 20,
        62,
        'рейд по экономике',
        e => ids.has(e.id),
      );
      if (hit.length) return hit;
      const target = nearest(unit, prey)!;
      return approachEnemy(ctx, 'F02', unit, target, 52, 'лечу в рейд');
    });
  },
};

/** F03: базе нужна помощь — перехватить доступную цель. */
export const F03: AiRule = {
  id: 'F03',
  group: 'defense',
  title: 'Воздушный перехват',
  evaluate: ctx => {
    const alarm = baseAlarm(ctx);
    if (!alarm.length) return [];
    const ids = new Set(alarm.map(({ id }) => id));
    return griffons(ctx).flatMap((unit): Candidate[] => {
      const hit = strikeBest(
        ctx,
        'F03',
        unit,
        e => e.attack - e.hp / 20,
        75,
        'защищаю базу с воздуха',
        e => ids.has(e.id),
      );
      if (hit.length) return hit;
      return approachEnemy(
        ctx,
        'F03',
        unit,
        nearest(unit, alarm)!,
        65,
        'лечу на помощь базе',
      );
    });
  },
};

/** F04: сильная ПВО рядом — сменить путь или отступить. */
export const F04: AiRule = {
  id: 'F04',
  group: 'defense',
  title: 'Уход от ПВО',
  evaluate: ctx =>
    griffons(ctx).flatMap(unit => {
      const danger = ctx.threatAt(unit, 'griffon');
      const weak = unit.hp <= unit.maxHp * ctx.config.lowHp;
      if (danger < unit.hp / 2 && !(weak && danger > 0)) return [];
      return retreat(ctx, 'F04', unit, 86, 'сильная ПВО: отступаю');
    }),
};
