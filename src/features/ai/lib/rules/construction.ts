import { MAX_POPULATION_LIMIT, REPAIR } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { affordable, isNear, nearest } from '../facts';
import { manhattan } from '../geometry';
import { standCells, stepToward } from '../movement';
import { isFree, moveTo, taskOf } from './common';
import {
  buildStep,
  continueBuilds,
  idleWorkers,
  nearestIdleWorker,
  pickBuildSite,
} from './building';

const hasTask = (ctx: AiContext, ruleId: string) =>
  ctx.memory.tasks.some(task => task.ruleId === ruleId);

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
    const worker = site && nearestIdleWorker(ctx, site);
    if (!site || !worker) return [];
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

/**
 * W07: стратегии нужно производство или защита — казармы, при угрозе
 * с известного направления — башня.
 */
export const W07: AiRule = {
  id: 'W07',
  group: 'build',
  title: 'Производство и защита',
  evaluate: ctx => {
    const continued = continueBuilds(ctx, 'W07', 'build', 57);
    if (continued.length) return continued;
    if (hasTask(ctx, 'W07') || !ctx.base) return [];
    const has = (type: string) =>
      ctx.obs.ownBuildings.some(building => building.type === type);
    const threat = nearest(
      ctx.base,
      [...ctx.enemies, ...ctx.remembered].filter(({ armed }) => armed),
    );
    const wantsTower =
      (ctx.memory.strategy === 'G10' || ctx.memory.strategy === 'G01') &&
      !has('tower');
    const barracks = ctx.obs.ownBuildings.filter(
      b => b.type === 'barracks',
    ).length;
    // Золото копится быстрее найма в одних казармах — вторые казармы.
    const moreBarracks = barracks < 2 && ctx.obs.stock.gold >= 250;
    const type =
      barracks === 0 || moreBarracks ? 'barracks' : wantsTower ? 'tower' : null;
    if (!type) return [];
    const site = pickBuildSite(
      ctx,
      type,
      4,
      type === 'tower' ? threat : undefined,
    );
    const worker = site && nearestIdleWorker(ctx, site);
    if (!site || !worker) return [];
    return buildStep(
      ctx,
      'W07',
      'build',
      worker,
      type,
      site,
      type === 'barracks' ? 52 : 48,
      type === 'barracks'
        ? 'нужны казармы для армии'
        : 'угроза с направления: строю башню',
    );
  },
};

/** W08: важное своё здание повреждено и ремонт безопасен — починить. */
export const W08: AiRule = {
  id: 'W08',
  group: 'economy',
  title: 'Ремонт',
  evaluate: ctx => {
    if (!affordable(ctx, REPAIR.cost)) return [];
    const damaged = ctx.obs.ownBuildings
      .filter(
        b => b.hp < b.maxHp * ctx.config.repairBelow && ctx.threatAt(b) === 0,
      )
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
    const target = damaged[0];
    if (!target) return [];
    const importance = target.type === 'base' ? 15 : 0;
    const worker = ctx.workers
      .filter(w => isFree(ctx, w.id) && w.buildPoints > 0 && !taskOf(ctx, w.id))
      .sort((a, b) => manhattan(a, target) - manhattan(b, target))[0];
    if (!worker) return [];
    const basis = { building: target.type, hp: target.hp, maxHp: target.maxHp };
    if (isNear(worker, target)) {
      return [
        {
          ruleId: 'W08',
          group: 'economy',
          actorId: worker.id,
          action: {
            type: 'repair',
            workerId: worker.id,
            buildingId: target.id,
          },
          score: 50 + importance,
          reason: 'здание повреждено: чиню',
          basis,
        },
      ];
    }
    if (worker.workplaceId) return [];
    const step = stepToward(ctx, worker, standCells(ctx, target));
    return step
      ? [
          moveTo(
            'W08',
            worker,
            step.next,
            40 + importance,
            'иду чинить здание',
            { basis },
          ),
        ]
      : [];
  },
};

/**
 * W09: место работы потеряно (разрушено) — отстроить на том же месте,
 * если оно безопасно и хватает ресурсов; иначе W02/W03 найдут другое.
 */
export const W09: AiRule = {
  id: 'W09',
  group: 'economy',
  title: 'Восстановление добычи',
  evaluate: ctx => {
    const continued = continueBuilds(ctx, 'W09', 'economy', 56);
    if (continued.length) return continued;
    const alive = new Set(ctx.obs.ownBuildings.map(({ id }) => id));
    return Object.entries(ctx.memory.lastWorkplace).flatMap(
      ([workerId, place]): Candidate[] => {
        if (alive.has(place.buildingId)) return [];
        const worker = idleWorkers(ctx).find(({ id }) => id === workerId);
        if (!worker || ctx.occupied(place.x, place.y)) return [];
        if (ctx.threatAt(place) > 0) return [];
        return buildStep(
          ctx,
          'W09',
          'economy',
          worker,
          place.type,
          place,
          55,
          'место работы разрушено: отстраиваю',
        );
      },
    );
  },
};
