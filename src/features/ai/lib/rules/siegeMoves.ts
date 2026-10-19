import { SIEGE_STRIKE } from '@shared/config';
import { isFlyingType } from '@shared/lib';
import type { AiRule, Candidate } from '../../model/types';
import { nearest } from '../facts';
import { manhattan } from '../geometry';
import { stepToward } from '../movement';
import { bestMove, isFree, meleeThreat, moveTo } from './common';
import {
  cellsNear,
  coverUnits,
  followGroup,
  hasCover,
  inGroup,
  unitsOf,
} from './roleKit';
import { buildingTargets, guns, inStrikeRange } from './siege';

/** Движение осады и уход своих из-под отметок удара. */

/** O01: планируется штурм — идти с прикрытием, не уходя вперёд одной. */
export const O01: AiRule = {
  id: 'O01',
  group: 'attack',
  title: 'Осада с группой',
  evaluate: ctx =>
    unitsOf(ctx, 'siege')
      .filter(unit => inGroup(ctx, unit))
      .flatMap(unit => followGroup(ctx, 'O01', unit, 34)),
};

/**
 * O03: огневой позиции нет — занять клетку в дальности цели вне ближней
 * угрозы и рядом с прикрытием.
 */
export const O03: AiRule = {
  id: 'O03',
  group: 'attack',
  title: 'Огневая позиция осады',
  evaluate: ctx => {
    if (ctx.memory.operation.phase === 'retreat') return [];
    const targets = buildingTargets(ctx);
    if (!targets.length) return [];
    return guns(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0) return [];
      if (targets.some(t => inStrikeRange(ctx, unit, t))) return [];
      const goal = nearest(unit, targets)!;
      const spots = cellsNear(ctx, goal, SIEGE_STRIKE.maxRange).filter(
        c => manhattan(c, goal) >= 3 && meleeThreat(ctx, c) === 0,
      );
      const step = stepToward(ctx, unit, spots);
      // Шаг только рядом с прикрытием: одно орудие вперёд не уходит.
      return step && hasCover(ctx, step.next, unit)
        ? [
            moveTo('O03', unit, step.next, 45, 'иду на огневую позицию', {
              basis: { x: goal.x, y: goal.y },
            }),
          ]
        : [];
    });
  },
};

/**
 * O04: сопровождение отстало — ждать в безопасной точке. Под угрозой
 * орудие отходит к ближайшему прикрытию; иначе стоит на месте.
 */
export const O04: AiRule = {
  id: 'O04',
  group: 'defense',
  title: 'Ожидание прикрытия',
  evaluate: ctx =>
    unitsOf(ctx, 'siege').flatMap((unit): Candidate[] => {
      if (hasCover(ctx, unit, unit)) return [];
      const cover = nearest(unit, coverUnits(ctx, unit));
      if (ctx.threatAt(unit) > 0 && cover && unit.movePoints > 0) {
        const step = stepToward(ctx, unit, cellsNear(ctx, cover, 1));
        if (step)
          return [
            moveTo(
              'O04',
              unit,
              step.next,
              60,
              'прикрытие отстало: отхожу к нему',
            ),
          ];
      }
      return [
        {
          ruleId: 'O04',
          group: 'defense',
          actorId: unit.id,
          action: { type: 'wait', actorId: unit.id },
          score: 0,
          reason: 'прикрытие отстало: жду',
        },
      ];
    }),
};

/**
 * Уход с отметки важнее любой атаки при любых весах стратегии: атака
 * обнуляет движение, и юнит остаётся под ударом (≈95 × 1,8 < 200).
 */
const X02_SCORE = 200;

/**
 * X02 (контригра S15): свой юнит стоит на публичной отметке удара — уйти
 * с неё до исполнения. Позиция орудия не известна и не нужна: решение
 * одинаково в мирах с разными скрытыми приготовлениями.
 */
export const X02: AiRule = {
  id: 'X02',
  group: 'defense',
  title: 'Уход из-под удара',
  evaluate: ctx =>
    ctx.obs.ownUnits.flatMap((unit): Candidate[] => {
      if (!isFree(ctx, unit.id) || unit.movePoints <= 0) return [];
      if (!ctx.struck(unit)) return [];
      // Летающего удар не задевает.
      if (isFlyingType(unit.type)) return [];
      const cell = bestMove(
        ctx,
        unit,
        c => -ctx.threatAt(c) - manhattan(c, unit),
      );
      return cell
        ? [
            moveTo('X02', unit, cell, X02_SCORE, 'клетка под ударом: ухожу', {
              basis: { x: unit.x, y: unit.y },
            }),
          ]
        : [];
    }),
};
