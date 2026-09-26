import type { CombatBuilding } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { manhattan } from '../geometry';
import {
  attackOf,
  isDoomed,
  isFree,
  isKillable,
  targetsInRange,
} from './common';

const towers = (ctx: AiContext) =>
  ctx.obs.ownBuildings.filter(
    (b): b is CombatBuilding =>
      b.role === 'combat' && b.attackPoints > 0 && isFree(ctx, b.id),
  );

/** Видимые живые цели в дальности башни. Память о врагах целью не бывает. */
const live = (ctx: AiContext, tower: CombatBuilding) =>
  targetsInRange(ctx, tower, tower.attackRange).filter(
    enemy => !isDoomed(ctx, enemy),
  );

/** Правило башни: выбрать первую подходящую цель и атаковать. */
const towerRule = (
  id: string,
  title: string,
  score: number,
  reason: string,
  pick: (
    ctx: AiContext,
    tower: CombatBuilding,
    targets: EnemyView[],
  ) => EnemyView | undefined,
): AiRule => ({
  id,
  group: 'defense',
  title,
  evaluate: ctx =>
    towers(ctx).flatMap((tower): Candidate[] => {
      const target = pick(ctx, tower, live(ctx, tower));
      return target
        ? [{ ...attackOf(id, tower, target, score, reason), group: 'defense' }]
        : [];
    }),
});

/** T01: ратуше грозит немедленный урон — бить источник угрозы. */
export const T01 = towerRule(
  'T01',
  'Защита ратуши',
  95,
  'бью угрозу ратуше',
  (ctx, _t, targets) => {
    const base = ctx.base;
    return base
      ? targets.find(e => e.armed && manhattan(e, base) <= e.range + e.move)
      : undefined;
  },
);

/** T02: можно уничтожить опасную цель — добить с учётом общего фокуса. */
export const T02 = towerRule(
  'T02',
  'Добивание башней',
  85,
  'добиваю опасную цель',
  (ctx, tower, targets) =>
    targets.find(e => e.armed && isKillable(ctx, e, tower.attack)),
);

/**
 * T03: враг бьёт по обороне — приоритетно по нему. Осадных машин пока нет
 * (S14): правило берёт любого врага, достающего до своих зданий.
 */
export const T03 = towerRule(
  'T03',
  'Угроза обороне',
  75,
  'бью врага, достающего до зданий',
  (ctx, _t, targets) =>
    targets.find(
      e =>
        e.armed && ctx.obs.ownBuildings.some(b => manhattan(b, e) <= e.range),
    ),
);

/** T04: рабочие или стрелки атакованы — прикрыть выстрелом по нападающему. */
export const T04 = towerRule(
  'T04',
  'Прикрытие своих',
  70,
  'прикрываю рабочего или стрелка',
  (ctx, _t, targets) =>
    targets.find(
      e =>
        e.armed &&
        ctx.obs.ownUnits.some(
          u =>
            (u.role === 'civil' || u.type === 'archer') &&
            manhattan(u, e) <= e.range,
        ),
    ),
);

/**
 * T05: законной видимой цели нет — сохранить действие. Контакт из памяти
 * не атакуется: предложение `wait` не выполняется, а остаётся в журнале.
 */
export const T05: AiRule = {
  id: 'T05',
  group: 'defense',
  title: 'Башня ждёт',
  evaluate: ctx =>
    towers(ctx)
      .filter(tower => live(ctx, tower).length === 0)
      .map(tower => ({
        ruleId: 'T05',
        group: 'defense' as const,
        actorId: tower.id,
        action: { type: 'wait' as const, actorId: tower.id },
        score: 0,
        reason: 'видимой цели нет: жду',
      })),
};
