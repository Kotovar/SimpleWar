import type { AiRule, Candidate } from '../../model/types';
import { enemyTarget } from '../facts';
import { chebyshev, manhattan } from '../geometry';
import { standCells, stepToward } from '../movement';
import { strikeGroup } from '../operation';
import { isFree, moveTo, taskOf, wouldBlock } from './common';
import { unitsOf } from './roleKit';
import { siteDanger } from './siteScouting';

export const M08: AiRule = {
  id: 'M08',
  group: 'attack',
  title: 'Захват и защита аванпостов',
  evaluate: ctx => {
    const group = strikeGroup(ctx).filter(
      unit => isFree(ctx, unit.id) && unit.attack > 0,
    );
    const result: Candidate[] = [];
    const scouts = unitsOf(ctx, 'scout').filter(
      unit => !taskOf(ctx, unit.id) || taskOf(ctx, unit.id)?.kind === 'scout',
    );
    const danger = scouts.length ? siteDanger(ctx) : null;
    for (const site of ctx.obs.sites ?? []) {
      if (
        site.type !== 'ruins' ||
        ctx.occupied(site.x, site.y) ||
        ctx.threatAt(site) > 0 ||
        wouldBlock(ctx, site)
      )
        continue;
      const unit = [
        ...(danger?.[site.y * ctx.width + site.x] ? [] : scouts),
        ...group,
      ].sort((a, b) => manhattan(a, site) - manhattan(b, site))[0];
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
        if (
          unit.type !== 'scout' &&
          enemy &&
          manhattan(unit, enemy) < manhattan(unit, site)
        )
          continue;
        const here = danger?.[unit.y * ctx.width + unit.x] ?? 0;
        const avoid =
          unit.type === 'scout'
            ? danger?.map(depth => (depth > here ? 1 : 0))
            : undefined;
        for (const strike of ctx.obs.strikes)
          if (avoid) avoid[strike.y * ctx.width + strike.x] = 1;
        const step = stepToward(ctx, unit, standCells(ctx, site), avoid);
        if (step && ctx.threatAt(step.next, unit.type) === 0)
          result.push(
            moveTo('M08', unit, step.next, 58, 'иду занимать ближайшие руины', {
              action: { type: 'move', unitId: unit.id, ...step.next, avoid },
            }),
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
