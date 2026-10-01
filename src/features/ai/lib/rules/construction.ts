import { BUILDINGS_CONFIG, REPAIR } from '@shared/config';
import type { AiRule, Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { roleWishes } from '../composition';
import { isNear, nearest } from '../facts';
import { affordable } from '../saving';
import { manhattan } from '../geometry';
import { standCells, stepToward } from '../movement';
import { isFree, moveTo, taskOf } from './common';
import { bestResearch } from '../researchValue';
import { buildStep, continueBuilds, pickBuildSite } from './building';
import {
  artelSite,
  idleWorkers,
  minerToBuild,
  nearestIdleWorker,
} from './builders';

export const hasTask = (ctx: AiContext, ruleId: string) =>
  ctx.memory.tasks.some(task => task.ruleId === ruleId);

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
    // Кузница: стратегия исследований либо затянувшаяся партия.
    const wantsForge =
      !has('forge') &&
      (ctx.memory.strategy === 'G12' || ctx.obs.turn >= ctx.config.forgeTurn) &&
      !!bestResearch(ctx);
    // Здание найма для нужной роли, которой негде нанять.
    const producer = roleWishes(ctx).find(wish => !has(wish.producer));
    const type =
      barracks === 0
        ? 'barracks'
        : wantsTower
          ? 'tower'
          : wantsForge
            ? 'forge'
            : moreBarracks
              ? 'barracks'
              : (producer?.producer ?? null);
    if (!type) return [];
    const picked = pickBuildSite(
      ctx,
      type,
      4,
      type === 'tower' ? threat : undefined,
    );
    const idle = picked && nearestIdleWorker(ctx, picked);
    // Башня стоит у угрозы; остальное с Артелью строится с добычи.
    const artel = idle || type === 'tower' ? null : artelSite(ctx, type);
    const worker = idle ?? artel?.worker;
    const site = idle ? picked : artel?.site;
    // Кузницу некому строить — все на добыче: снять одного (G12).
    if (!worker && picked && type === 'forge') {
      return affordable(ctx, BUILDINGS_CONFIG.forge.cost, 'forge')
        ? minerToBuild(
            ctx,
            'W07',
            'build',
            'forge',
            picked,
            46,
            'снимаю рабочего строить кузницу',
          )
        : [];
    }
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
        : type === 'tower'
          ? 'угроза с направления: строю башню'
          : type === 'forge'
            ? 'нужна кузница для исследований'
            : `${producer?.reason}: строю ${type}`,
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
    const inside = worker.x === target.x && worker.y === target.y;
    if (isNear(worker, target) || inside) {
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
