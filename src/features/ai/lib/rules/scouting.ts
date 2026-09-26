import type { MilitaryUnit, Position } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { enemyTarget, nearest } from '../facts';
import { manhattan, tieBreak } from '../geometry';
import { standCells, stepToward } from '../movement';
import { garrisonUnits } from '../operation';
import { isFree, moveTo, taskOf } from './common';

/** Шаг разведчика к цели задачи с сохранением задачи. */
const scoutStep = (
  ctx: AiContext,
  ruleId: string,
  unit: MilitaryUnit,
  target: Position,
  score: number,
  reason: string,
): Candidate[] => {
  const goals = ctx.occupied(target.x, target.y)
    ? standCells(ctx, target)
    : [target];
  const step = stepToward(ctx, unit, goals);
  if (!step) return [];
  return [
    moveTo(ruleId, unit, step.next, score, reason, {
      group: 'scout',
      task: {
        kind: 'scout',
        ruleId,
        unitId: unit.id,
        target,
        reserve: { gold: 0, wood: 0 },
      },
      basis: { x: target.x, y: target.y },
    }),
  ];
};

/** Свободный военный, которого можно отправить в разведку. */
const spareScout = (ctx: AiContext, near: Position) => {
  const garrison = new Set(garrisonUnits(ctx).map(({ id }) => id));
  return [...ctx.military]
    .filter(
      unit =>
        isFree(ctx, unit.id) &&
        !garrison.has(unit.id) &&
        !taskOf(ctx, unit.id) &&
        unit.movePoints > 0,
    )
    .sort((a, b) => manhattan(a, near) - manhattan(b, near))[0];
};

/**
 * G05: вражеская база не найдена — разведка разных границ. Цели задач не
 * повторяются; целью служит граница разведки, а не место из генератора.
 */
export const G05: AiRule = {
  id: 'G05',
  group: 'scout',
  title: 'Разведка границ',
  evaluate: ctx => {
    const tasks = ctx.memory.tasks.filter(task => task.ruleId === 'G05');
    const continued = tasks.flatMap(task => {
      const unit = ctx.military.find(({ id }) => id === task.unitId);
      return unit && isFree(ctx, unit.id)
        ? scoutStep(ctx, 'G05', unit, task.target, 40, 'разведываю границу')
        : [];
    });
    if (continued.length || tasks.length) return continued;
    if (enemyTarget(ctx) || ctx.military.length < 2 || !ctx.base) return [];
    const base = ctx.base;
    const target = [...ctx.frontier].sort(
      (a, b) =>
        manhattan(b, base) - manhattan(a, base) ||
        tieBreak(`${a.x},${a.y}`, ctx.memory.seed) -
          tieBreak(`${b.x},${b.y}`, ctx.memory.seed),
    )[0];
    const unit = target && spareScout(ctx, base);
    return unit
      ? scoutStep(ctx, 'G05', unit, target, 42, 'ищу вражескую базу')
      : [];
  },
};

/** G07: план опирается на старый контакт — перепроверить его место. */
export const G07: AiRule = {
  id: 'G07',
  group: 'scout',
  title: 'Проверка контакта',
  evaluate: ctx => {
    const tasks = ctx.memory.tasks.filter(task => task.ruleId === 'G07');
    const continued = tasks.flatMap(task => {
      const unit = ctx.military.find(({ id }) => id === task.unitId);
      return unit && isFree(ctx, unit.id)
        ? scoutStep(
            ctx,
            'G07',
            unit,
            task.target,
            30,
            'проверяю старый контакт',
          )
        : [];
    });
    if (continued.length || tasks.length || !ctx.base) return continued;
    const stale = ctx.obs.contacts.filter(
      contact => contact.kind === 'unit' && contact.confidence === 'stale',
    );
    const contact = nearest(ctx.base, stale);
    const unit = contact && spareScout(ctx, contact);
    return unit
      ? scoutStep(
          ctx,
          'G07',
          unit,
          contact,
          30,
          'контакт устарел: проверяю место',
        )
      : [];
  },
};

/** G10: гарнизон держится у ратуши. */
export const G10: AiRule = {
  id: 'G10',
  group: 'defense',
  title: 'Гарнизон',
  evaluate: ctx => {
    const { base } = ctx;
    if (!base) return [];
    return garrisonUnits(ctx)
      .filter(unit => isFree(ctx, unit.id) && manhattan(unit, base) > 2)
      .flatMap(unit => {
        const step = stepToward(ctx, unit, standCells(ctx, base));
        return step
          ? [
              moveTo('G10', unit, step.next, 35, 'возвращаюсь в гарнизон', {
                group: 'defense',
              }),
            ]
          : [];
      });
  },
};
