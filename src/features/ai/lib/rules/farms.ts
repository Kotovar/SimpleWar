import {
  BUILDINGS_CONFIG,
  MAX_POPULATION_LIMIT,
  UNITS_CONFIG,
  type Position,
} from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { manhattan } from '../geometry';
import {
  buildStep,
  continueBuilds,
  nearestIdleWorker,
  pickBuildSite,
} from './building';
import { isFree, taskOf } from './common';
import { hasTask } from './construction';
import { affordable } from '../saving';

/**
 * Население заполнено, а свободного рабочего нет: нанять его нельзя, и ферму
 * строить некому. Снять с добычи ближайшего к базе рабочего — иначе рост
 * останавливается навсегда.
 */
const freeBuilder = (
  ctx: AiContext,
  site: Position,
  occupied: number,
  max: number,
): Candidate[] => {
  if (max - occupied >= UNITS_CONFIG.worker.requiresLimit || !ctx.base)
    return [];
  // Ферму не на что строить — рабочий нужнее на добыче.
  if (!affordable(ctx, BUILDINGS_CONFIG.farm.cost, 'farm')) return [];
  const base = ctx.base;
  const miner = ctx.workers
    .filter(w => w.workplaceId && isFree(ctx, w.id) && !taskOf(ctx, w.id))
    .sort((a, b) => manhattan(a, base) - manhattan(b, base))[0];
  return miner
    ? [
        {
          ruleId: 'W06',
          group: 'build',
          actorId: miner.id,
          action: { type: 'unassign', workerId: miner.id },
          score: 55,
          reason: `население ${occupied}/${max}: снимаю рабочего строить ферму`,
          // Задача сразу: иначе W02/W03 вернут рабочего на добычу.
          task: {
            kind: 'build',
            ruleId: 'W06',
            unitId: miner.id,
            target: site,
            buildingType: 'farm',
            reserve: BUILDINGS_CONFIG.farm.cost,
          },
        },
      ]
    : [];
};

/** W06: следующий найм упрётся в население — построить ферму у базы. */
export const W06: AiRule = {
  id: 'W06',
  group: 'build',
  title: 'Ферма',
  evaluate: ctx => {
    const continued = continueBuilds(ctx, 'W06', 'build', 58);
    if (continued.length) return continued;
    const { occupied, max } = ctx.obs.population;
    if (max - occupied >= 3 || max >= MAX_POPULATION_LIMIT) return [];
    if (hasTask(ctx, 'W06')) return [];
    const site = pickBuildSite(ctx, 'farm', 4);
    if (!site) return [];
    const worker = nearestIdleWorker(ctx, site);
    if (!worker) return freeBuilder(ctx, site, occupied, max);
    return buildStep(
      ctx,
      'W06',
      'build',
      worker,
      'farm',
      site,
      55,
      `население ${occupied}/${max}: строю ферму`,
    );
  },
};
