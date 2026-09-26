import type { MilitaryUnit, Position } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { baseAlarm, nearest } from '../facts';
import { manhattan } from '../geometry';
import { standCells, stepToward } from '../movement';
import { garrisonUnits } from '../operation';
import {
  attackOf,
  bestMove,
  canAttack,
  isDoomed,
  isFree,
  isKillable,
  moveTo,
  targetsInRange,
} from './common';

/** Мечники, ещё действующие в этом ходу. */
export const swordsmen = (ctx: AiContext) =>
  ctx.military.filter(
    unit => unit.type === 'swordsman' && isFree(ctx, unit.id),
  );

/** Ценность цели: опасность, возможность добить, близость к своим. */
export const targetValue = (
  ctx: AiContext,
  enemy: EnemyView,
  damage: number,
) => {
  const nearHome = ctx.base && manhattan(enemy, ctx.base) <= 4 ? 15 : 0;
  return (
    (enemy.armed ? 20 + enemy.attack : 5) +
    (isKillable(ctx, enemy, damage) ? 30 : 0) +
    (enemy.range > 1 ? 5 : 0) +
    nearHome -
    enemy.hp / 40
  );
};

/** Шаг к врагу: клетка рядом с ним по сторонам (ближний бой). */
const approach = (
  ctx: AiContext,
  unit: MilitaryUnit,
  enemy: Position,
): Position | null =>
  stepToward(ctx, unit, standCells(ctx, enemy, false))?.next ?? null;

/** Враги, опасные для базы и рабочих. */
const intruders = (ctx: AiContext) => {
  const alarm = baseAlarm(ctx);
  const nearWorkers = ctx.enemies.filter(
    enemy =>
      enemy.armed && ctx.workers.some(worker => manhattan(worker, enemy) <= 3),
  );
  return [...new Set([...alarm, ...nearWorkers])];
};

/** M01: враг угрожает базе или рабочим — перехватить ближайшего. */
export const M01: AiRule = {
  id: 'M01',
  group: 'defense',
  title: 'Перехват у базы',
  evaluate: ctx => {
    const danger = intruders(ctx);
    if (!danger.length) return [];
    return swordsmen(ctx).flatMap((unit): Candidate[] => {
      const inRange = danger.filter(
        enemy =>
          manhattan(enemy, unit) <= unit.attackRange && !isDoomed(ctx, enemy),
      );
      if (inRange.length && canAttack(unit)) {
        return [
          {
            ...attackOf('M01', unit, inRange[0], 85, 'бью врага у базы'),
            group: 'defense',
          },
        ];
      }
      const target = nearest(unit, danger);
      const cell = target && approach(ctx, unit, target);
      return cell
        ? [
            moveTo('M01', unit, cell, 75, 'перехватываю врага у базы', {
              group: 'defense',
            }),
          ]
        : [];
    });
  },
};

/** M02: уязвимый свой рабочий или стрелок — прикрыть его собой. */
export const M02: AiRule = {
  id: 'M02',
  group: 'defense',
  title: 'Сопровождение',
  evaluate: ctx => {
    const exposed = ctx.obs.ownUnits.filter(
      unit =>
        (unit.role === 'civil' || unit.type === 'archer') &&
        ctx.threatAt(unit) > 0,
    );
    if (!exposed.length) return [];
    return swordsmen(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0) return [];
      if (targetsInRange(ctx, unit, unit.attackRange).length) return [];
      const ward = nearest(unit, exposed);
      const threat =
        ward &&
        nearest(
          ward,
          ctx.enemies.filter(e => e.armed),
        );
      if (!ward || !threat || manhattan(unit, ward) <= 1) return [];
      const cell = bestMove(ctx, unit, c =>
        manhattan(c, ward) <= 1
          ? 100 - manhattan(c, threat)
          : -manhattan(c, ward),
      );
      return cell
        ? [
            moveTo('M02', unit, cell, 40, 'прикрываю уязвимого', {
              group: 'defense',
            }),
          ]
        : [];
    });
  },
};

/** M05: можно снять опасную цель общим фокусом — атаковать её. */
export const M05: AiRule = {
  id: 'M05',
  group: 'attack',
  title: 'Фокус огня',
  evaluate: ctx =>
    swordsmen(ctx).flatMap((unit): Candidate[] => {
      if (!canAttack(unit)) return [];
      const targets = targetsInRange(ctx, unit, unit.attackRange).filter(
        enemy => !isDoomed(ctx, enemy),
      );
      const best = [...targets].sort(
        (a, b) =>
          targetValue(ctx, b, unit.attack) - targetValue(ctx, a, unit.attack),
      )[0];
      return best
        ? [
            attackOf(
              'M05',
              unit,
              best,
              60 + targetValue(ctx, best, unit.attack) / 2,
              isKillable(ctx, best, unit.attack)
                ? 'добиваю цель'
                : 'атакую цель в дальности',
            ),
          ]
        : [];
    }),
};

/** M06: мало HP и бой рядом — отступить к своим по безопасному пути. */
export const M06: AiRule = {
  id: 'M06',
  group: 'defense',
  title: 'Отход раненого',
  evaluate: ctx => {
    const home = ctx.base ?? garrisonUnits(ctx)[0];
    return swordsmen(ctx).flatMap(unit => {
      if (unit.hp > unit.maxHp * ctx.config.lowHp || unit.movePoints <= 0)
        return [];
      const danger = ctx.threatAt(unit);
      if (danger === 0) return [];
      const cell = bestMove(
        ctx,
        unit,
        c => -ctx.threatAt(c) * 10 - (home ? manhattan(c, home) : 0),
      );
      return cell && ctx.threatAt(cell) < danger
        ? [
            moveTo('M06', unit, cell, 80, 'ранен: отхожу к своим', {
              group: 'defense',
              basis: { hp: unit.hp },
            }),
          ]
        : [];
    });
  },
};
