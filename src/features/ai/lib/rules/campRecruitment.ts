import { CAMP_HIRE_COST, UNITS_CONFIG, type Position } from '@shared/config';
import type { AiRule } from '../../model/types';
import type { AiContext } from '../context';
import { desiredArmy, enemyTarget, nextRecruit } from '../facts';
import { chebyshev, manhattan } from '../geometry';
import { affordable } from '../saving';
import { canHire, producers, spawnCell } from './production';

/** Лагерь выгоден при нехватке дерева, найма или более близком подкреплении. */
export const campRecruit = (ctx: AiContext, camp: Position) => {
  if (ctx.military.length >= desiredArmy(ctx)) return null;
  const type = nextRecruit(ctx);
  if (type !== 'swordsman' && type !== 'archer') return null;
  if (
    ctx.obs.population.occupied + UNITS_CONFIG[type].requiresLimit >
    ctx.obs.population.max
  )
    return null;
  if (!affordable(ctx, CAMP_HIRE_COST[type], 'army')) return null;
  const goal = enemyTarget(ctx) ?? ctx.memory.operation.target;
  const cheaper = producers(ctx).some(
    building =>
      canHire(ctx, building, type) &&
      (!goal || manhattan(building, goal) <= manhattan(camp, goal) + 6),
  );
  return cheaper ? null : type;
};

export const N05: AiRule = {
  id: 'N05',
  group: 'hire',
  title: 'Наёмники лагеря',
  evaluate: ctx =>
    (ctx.obs.sites ?? []).flatMap(camp => {
      if (
        camp.type !== 'camp' ||
        camp.hiresLeft <= 0 ||
        !ctx.obs.visible[camp.y]?.[camp.x]
      )
        return [];
      if (
        !ctx.military.some(
          unit => unit.type === 'scout' && chebyshev(unit, camp) === 1,
        )
      )
        return [];
      const type = campRecruit(ctx, camp);
      const cell = type && spawnCell(ctx, camp);
      if (!type || !cell || !ctx.obs.visible[cell.y]?.[cell.x]) return [];
      return [
        {
          ruleId: 'N05',
          group: 'hire',
          actorId: null,
          action: {
            type: 'spawn' as const,
            campId: camp.id,
            unitType: type,
            ...cell,
          },
          score: 65,
          reason: 'выгодное подкрепление из лагеря',
          basis: { camp: camp.id, gold: CAMP_HIRE_COST[type].gold },
        },
      ];
    }),
};
