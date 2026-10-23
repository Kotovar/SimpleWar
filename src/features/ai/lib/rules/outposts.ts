import type { AiRule, Candidate } from '../../model/types';
import { enemyTarget } from '../facts';
import { chebyshev, manhattan } from '../geometry';
import { standCells, stepToward } from '../movement';
import { strikeGroup } from '../operation';
import { isFree, moveTo, wouldBlock } from './common';

export const M08: AiRule = {
  id: 'M08',
  group: 'attack',
  title: 'Захват и защита аванпостов',
  evaluate: ctx => {
    const group = strikeGroup(ctx).filter(
      unit => isFree(ctx, unit.id) && unit.attack > 0,
    );
    const result: Candidate[] = [];
    for (const site of ctx.obs.sites ?? []) {
      if (
        site.type !== 'ruins' ||
        ctx.occupied(site.x, site.y) ||
        ctx.threatAt(site) > 0 ||
        wouldBlock(ctx, site)
      )
        continue;
      const unit = [...group].sort(
        (a, b) => manhattan(a, site) - manhattan(b, site),
      )[0];
      if (!unit) continue;
      if (chebyshev(unit, site) === 1) {
        if (unit.attackPoints <= 0 || !ctx.obs.visible[site.y]?.[site.x])
          continue;
        result.push({
          ruleId: 'M08',
          group: 'attack',
          actorId: unit.id,
          action: {
            type: 'occupyRuins',
            unitId: unit.id,
            x: site.x,
            y: site.y,
          },
          score: 76,
          reason: 'занимаю руины поселения',
        });
      } else {
        const enemy = enemyTarget(ctx);
        if (enemy && manhattan(unit, enemy) < manhattan(unit, site)) continue;
        const step = stepToward(ctx, unit, standCells(ctx, site));
        if (step && ctx.threatAt(step.next, unit.type) === 0)
          result.push(
            moveTo('M08', unit, step.next, 58, 'иду занимать ближайшие руины'),
          );
      }
    }
    for (const post of ctx.obs.ownBuildings.filter(b => b.type === 'outpost')) {
      const threat = ctx.enemies.find(
        enemy => enemy.armed && manhattan(enemy, post) <= 6,
      );
      if (!threat) continue;
      const guards = [...group]
        .sort((a, b) => manhattan(a, post) - manhattan(b, post))
        .slice(0, 2);
      for (const unit of guards) {
        if (
          manhattan(unit, post) <= 3 ||
          manhattan(unit, threat) <= unit.attackRange
        )
          continue;
        const step = stepToward(ctx, unit, standCells(ctx, post));
        if (step && ctx.threatAt(step.next, unit.type) < unit.hp)
          result.push(
            moveTo('M08', unit, step.next, 68, 'защищаю аванпост', {
              group: 'attack',
            }),
          );
      }
    }
    return result;
  },
};
