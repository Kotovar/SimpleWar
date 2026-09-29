import type { MilitaryUnit, Position, UnitType } from '@shared/config';
import { isFlyingType } from '@shared/lib';
import type { Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { nearest } from '../facts';
import { manhattan } from '../geometry';
import { stepToward } from '../movement';
import { strikeGroup } from '../operation';
import { attackOf, bestMove, isFree, liveTargets, moveTo } from './common';

// Общие действия ролей S15: роль — их комбинация и своя оценка целей.

/** Свои свободные военные данного типа. */
export const unitsOf = (ctx: AiContext, type: UnitType) =>
  ctx.military.filter(unit => unit.type === type && isFree(ctx, unit.id));

/** Типы, которые держат ближний бой и прикрывают стрелков, осаду и лекаря. */
const COVER: UnitType[] = ['swordsman', 'spearman', 'rider', 'griffon'];

/** Свои бойцы прикрытия, кроме самого юнита. */
export const coverUnits = (ctx: AiContext, self?: { id: string }) =>
  ctx.military.filter(
    unit => COVER.includes(unit.type) && unit.id !== self?.id,
  );

/** Есть ли своё прикрытие рядом с клеткой. */
export const hasCover = (
  ctx: AiContext,
  cell: Position,
  self?: { id: string },
  radius = 3,
) => coverUnits(ctx, self).some(unit => manhattan(unit, cell) <= radius);

/** Юнит в ударной группе. */
export const inGroup = (ctx: AiContext, unit: { id: string }) =>
  strikeGroup(ctx).some(({ id }) => id === unit.id);

/**
 * Известные проходимые клетки в радиусе от точки; `air` — любые клетки
 * карты: летающий встаёт и на воду, горы и лес.
 */
export const cellsNear = (
  ctx: AiContext,
  center: Position,
  radius: number,
  air = false,
) => {
  const cells: Position[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const cell = { x: center.x + dx, y: center.y + dy };
      if (manhattan(cell, center) > radius || !ctx.inside(cell)) continue;
      // Свои юниты клетку не закрывают: занятые цели отсеет `stepToward`.
      if (air || ctx.grid(1, true)[cell.y][cell.x] > 0) cells.push(cell);
    }
  }
  return cells;
};

/**
 * Отход: клетка с меньшей угрозой для своего типа, ближе к прикрытию или
 * ратуше. Нет клетки безопаснее текущей — предложения нет.
 */
export const retreat = (
  ctx: AiContext,
  ruleId: string,
  unit: MilitaryUnit,
  score: number,
  reason: string,
): Candidate[] => {
  const danger = ctx.threatAt(unit, unit.type);
  if (unit.movePoints <= 0 || danger === 0) return [];
  const home = nearest(unit, coverUnits(ctx, unit)) ?? ctx.base;
  const cell = bestMove(
    ctx,
    unit,
    c => -ctx.threatAt(c, unit.type) * 10 - (home ? manhattan(c, home) : 0),
  );
  return cell && ctx.threatAt(cell, unit.type) < danger
    ? [moveTo(ruleId, unit, cell, score, reason, { basis: { hp: unit.hp } })]
    : [];
};

/** Атака лучшей видимой цели в дальности по оценке роли. */
export const strikeBest = (
  ctx: AiContext,
  ruleId: string,
  unit: MilitaryUnit,
  value: (enemy: EnemyView) => number,
  score: number,
  reason: string,
  filter: (enemy: EnemyView) => boolean = () => true,
): Candidate[] => {
  if (unit.attackPoints <= 0 || unit.attack <= 0) return [];
  const target = liveTargets(ctx, unit)
    .filter(filter)
    .sort((a, b) => value(b) - value(a))[0];
  return target
    ? [attackOf(ruleId, unit, target, score + value(target) / 2, reason)]
    : [];
};

/**
 * Шаг к ближайшей клетке, откуда цель достаётся ударом вплотную.
 */
export const approachEnemy = (
  ctx: AiContext,
  ruleId: string,
  unit: MilitaryUnit,
  enemy: Position,
  score: number,
  reason: string,
): Candidate[] => {
  const goals = cellsNear(
    ctx,
    enemy,
    unit.attackRange,
    isFlyingType(unit.type),
  ).filter(c => manhattan(c, enemy) > 0);
  const step = stepToward(ctx, unit, goals);
  return step
    ? [
        moveTo(ruleId, unit, step.next, score, reason, {
          basis: { x: enemy.x, y: enemy.y },
        }),
      ]
    : [];
};

/**
 * Идти с ударной группой: при сборе — к месту сбора, при наступлении —
 * за передним бойцом прикрытия, не обгоняя его к цели.
 */
export const followGroup = (
  ctx: AiContext,
  ruleId: string,
  unit: MilitaryUnit,
  score: number,
): Candidate[] => {
  const { phase, target, rally } = ctx.memory.operation;
  if (unit.movePoints <= 0 || !inGroup(ctx, unit)) return [];
  if (phase === 'gather' || phase === 'retreat') {
    if (!rally || manhattan(unit, rally) <= 2) return [];
    const step = stepToward(ctx, unit, cellsNear(ctx, rally, 2));
    return step
      ? [moveTo(ruleId, unit, step.next, score, 'иду к месту сбора')]
      : [];
  }
  if (!target) return [];
  const front = nearest(
    target,
    coverUnits(ctx, unit).filter(u => inGroup(ctx, u)),
  );
  if (!front) return [];
  const line = manhattan(front, target);
  if (manhattan(unit, front) <= 2 && manhattan(unit, target) >= line) return [];
  const goals = cellsNear(ctx, front, 2).filter(
    c => manhattan(c, target) >= line,
  );
  const step = stepToward(ctx, unit, goals);
  return step
    ? [
        moveTo(ruleId, unit, step.next, score, 'иду за прикрытием группы', {
          basis: { x: front.x, y: front.y },
        }),
      ]
    : [];
};

/**
 * Боец ближнего боя в группе: бить лучшую цель в дальности, при
 * наступлении — идти к цели операции, иначе держаться с группой.
 */
export const assault = (
  ctx: AiContext,
  ruleId: string,
  unit: MilitaryUnit,
  score: number,
): Candidate[] => {
  if (!inGroup(ctx, unit)) return [];
  const hit = strikeBest(
    ctx,
    ruleId,
    unit,
    enemy => (enemy.armed ? 20 + enemy.attack : 10) - enemy.hp / 40,
    score + 20,
    'атакую цель группы',
  );
  if (hit.length) return hit;
  const { phase, target } = ctx.memory.operation;
  if ((phase === 'advance' || phase === 'engage') && target) {
    const near = manhattan(unit, target) <= unit.attackRange;
    const approach = near
      ? []
      : approachEnemy(ctx, ruleId, unit, target, score, 'наступаю на цель');
    if (approach.length || near) return approach;
  }
  return followGroup(ctx, ruleId, unit, score);
};
