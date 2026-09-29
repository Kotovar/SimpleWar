import { HEALING, type MilitaryUnit, type Unit } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { nearest } from '../facts';
import { manhattan } from '../geometry';
import { stepToward } from '../movement';
import { bestMove, meleeThreat, moveTo } from './common';
import {
  cellsNear,
  coverUnits,
  followGroup,
  retreat,
  unitsOf,
} from './roleKit';

const healers = (ctx: AiContext) =>
  unitsOf(ctx, 'healer').filter(unit => unit.attackPoints > 0);

/** Прибавка HP: не больше недостающего, как у команды лечения. */
const gain = (healer: MilitaryUnit, target: Unit) =>
  Math.min(HEALING[healer.type]?.amount ?? 0, target.maxHp - target.hp);

/** Свои раненые, кроме самого лекаря. */
const wounded = (ctx: AiContext, healer: MilitaryUnit) =>
  ctx.obs.ownUnits.filter(
    unit => unit.id !== healer.id && unit.hp < unit.maxHp,
  );

/** Лекарь в опасности: рядом ближний бой. */
const endangered = (ctx: AiContext, unit: MilitaryUnit) =>
  meleeThreat(ctx, unit) > 0;

/**
 * H01: раненый в дальности — лечить с наибольшей пользой: прибавка и
 * угроза раненому. Прибавки уже назначенных лечений видны в новом HP.
 */
export const H01: AiRule = {
  id: 'H01',
  group: 'defense',
  title: 'Лечение',
  evaluate: ctx =>
    healers(ctx).flatMap((unit): Candidate[] => {
      if (endangered(ctx, unit)) return [];
      const value = (target: Unit) =>
        gain(unit, target) + (ctx.threatAt(target) > 0 ? 10 : 0);
      const target = wounded(ctx, unit)
        .filter(
          t => manhattan(t, unit) <= unit.attackRange && gain(unit, t) > 0,
        )
        .sort((a, b) => value(b) - value(a))[0];
      return target
        ? [
            {
              ruleId: 'H01',
              group: 'defense',
              actorId: unit.id,
              action: { type: 'heal', healerId: unit.id, targetId: target.id },
              score: 55 + value(target),
              reason: 'лечу раненого',
              basis: { target: target.type, hp: target.hp },
            },
          ]
        : [];
    }),
};

/** H02: раненый вне дальности — встать на безопасную клетку лечения. */
export const H02: AiRule = {
  id: 'H02',
  group: 'defense',
  title: 'Подход к раненому',
  evaluate: ctx =>
    healers(ctx).flatMap((unit): Candidate[] => {
      if (unit.movePoints <= 0 || endangered(ctx, unit)) return [];
      const all = wounded(ctx, unit);
      if (all.some(t => manhattan(t, unit) <= unit.attackRange)) return [];
      const patient = nearest(unit, all);
      if (!patient) return [];
      // Не обгонять прикрытие: клетка без ближней угрозы.
      const spots = cellsNear(ctx, patient, unit.attackRange).filter(
        c => meleeThreat(ctx, c) === 0,
      );
      const step = stepToward(ctx, unit, spots);
      // Остановка этого хода тоже вне ближнего удара, а не только цель пути.
      return step && meleeThreat(ctx, step.next) === 0
        ? [
            moveTo('H02', unit, step.next, 48, 'иду лечить', {
              basis: { x: patient.x, y: patient.y },
            }),
          ]
        : [];
    }),
};

/** H03: лекарь под угрозой — уйти к защите вместо рискованного лечения. */
export const H03: AiRule = {
  id: 'H03',
  group: 'defense',
  title: 'Отход лекаря',
  evaluate: ctx =>
    unitsOf(ctx, 'healer').flatMap((unit): Candidate[] => {
      if (!endangered(ctx, unit) || unit.movePoints <= 0) return [];
      const cover = nearest(unit, coverUnits(ctx, unit)) ?? ctx.base;
      const cell = bestMove(
        ctx,
        unit,
        c => -meleeThreat(ctx, c) * 100 - (cover ? manhattan(c, cover) : 0),
      );
      return cell && meleeThreat(ctx, cell) < meleeThreat(ctx, unit)
        ? [moveTo('H03', unit, cell, 88, 'опасно: ухожу к защите')]
        : retreat(ctx, 'H03', unit, 88, 'опасно: ухожу к защите');
    }),
};

/** H04: лечить некого — идти с группой, не тратя действие на полное HP. */
export const H04: AiRule = {
  id: 'H04',
  group: 'defense',
  title: 'Сопровождение лекарем',
  evaluate: ctx =>
    healers(ctx)
      .filter(unit => wounded(ctx, unit).length === 0)
      .flatMap(unit => followGroup(ctx, 'H04', unit, 30)),
};
