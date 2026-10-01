import {
  BUILDINGS_CONFIG,
  type BuildingType,
  type CivilUnit,
  type Position,
} from '@shared/config';
import type { Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { isNear } from '../facts';
import { around, manhattan } from '../geometry';
import { siteOk } from './building';
import { isFree, taskOf } from './common';

/** Кто строит: свободные рабочие, Артель и снятие с добычи. */

/** Рабочий свободен для новой работы: жив, без задачи и не на добыче. */
export const idleWorkers = (ctx: AiContext): CivilUnit[] =>
  ctx.workers.filter(
    worker =>
      isFree(ctx, worker.id) && !taskOf(ctx, worker.id) && !worker.workplaceId,
  );

/**
 * Артель: рабочие на добыче с рабочим действием. Строят и расчищают
 * соседние клетки, не выходя из здания: добыча не теряется.
 */
export const artelMiners = (ctx: AiContext): CivilUnit[] =>
  ctx.obs.researched.includes('artel')
    ? ctx.workers.filter(
        w =>
          w.workplaceId &&
          w.buildPoints > 0 &&
          isFree(ctx, w.id) &&
          !taskOf(ctx, w.id),
      )
    : [];

/**
 * Ближайший к точке свободный рабочий; с Артелью первым — рабочий на
 * добыче рядом с площадкой: ему не нужно выходить.
 */
export const nearestIdleWorker = (ctx: AiContext, site: Position) =>
  artelMiners(ctx).find(miner => isNear(miner, site)) ??
  ([...idleWorkers(ctx)].sort(
    (a, b) => manhattan(a, site) - manhattan(b, site),
  )[0] as CivilUnit | undefined);

/** Артель: площадка рядом с рабочим на добыче, чтобы строить не выходя. */
export const artelSite = (
  ctx: AiContext,
  type: BuildingType,
): { worker: CivilUnit; site: Position } | null => {
  for (const worker of artelMiners(ctx)) {
    const site = around(worker).find(cell => siteOk(ctx, type, cell));
    if (site) return { worker, site };
  }
  return null;
};

/**
 * Свободного рабочего нет: снять с добычи ближайшего к базе и сразу дать
 * задачу стройки, иначе W02/W03 вернут его на добычу.
 */
export const minerToBuild = (
  ctx: AiContext,
  ruleId: string,
  group: Candidate['group'],
  type: BuildingType,
  site: Position,
  score: number,
  reason: string,
): Candidate[] => {
  const { base } = ctx;
  if (!base) return [];
  const miner = ctx.workers
    .filter(w => w.workplaceId && isFree(ctx, w.id) && !taskOf(ctx, w.id))
    .sort((a, b) => manhattan(a, base) - manhattan(b, base))[0];
  return miner
    ? [
        {
          ruleId,
          group,
          actorId: miner.id,
          action: { type: 'unassign', workerId: miner.id },
          score,
          reason,
          task: {
            kind: 'build',
            ruleId,
            unitId: miner.id,
            target: site,
            buildingType: type,
            reserve: BUILDINGS_CONFIG[type].cost,
          },
        },
      ]
    : [];
};
