import {
  BUILDINGS_CONFIG,
  MAX_POPULATION_LIMIT,
  UNITS_CONFIG,
  type Position,
} from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { buildStep, continueBuilds, pickBuildSite } from './building';
import { artelSite, minerToBuild, nearestIdleWorker } from './builders';
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
  if (max - occupied >= UNITS_CONFIG.worker.requiresLimit) return [];
  // Ферму не на что строить — рабочий нужнее на добыче.
  if (!affordable(ctx, BUILDINGS_CONFIG.farm.cost, 'farm')) return [];
  return minerToBuild(
    ctx,
    'W06',
    'build',
    'farm',
    site,
    55,
    `население ${occupied}/${max}: снимаю рабочего строить ферму`,
  );
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
    const picked = pickBuildSite(ctx, 'farm', 4);
    const idle = picked && nearestIdleWorker(ctx, picked);
    // Артель: свободных нет — строит рабочий с добычи у своего здания.
    const artel = idle ? null : artelSite(ctx, 'farm');
    const worker = idle ?? artel?.worker;
    const site = idle ? picked : (artel?.site ?? picked);
    if (!site) return [];
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
