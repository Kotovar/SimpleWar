import {
  BUILDINGS_CONFIG,
  type BuildingType,
  type CivilUnit,
  type Position,
} from '@shared/config';
import { isBuildableTerrain } from '@shared/lib';
import type { Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { affordable, isNear } from '../facts';
import { manhattan, tieBreak } from '../geometry';
import { standCells, stepToward } from '../movement';
import { isFree, taskOf, wouldBlock } from './common';

/**
 * Площадка для здания у своей базы: подходящая известная местность, не
 * занята, без известной угрозы, есть где встать рабочему, не перекрывает
 * последний проход. Ближе к базе лучше; `toward` сдвигает выбор к точке.
 *
 * @param type - Тип здания; для рудника и лесопилки — клетки ресурса.
 * @param radius - Наибольшее расстояние от базы.
 */
export const pickBuildSite = (
  ctx: AiContext,
  type: BuildingType,
  radius = 5,
  toward?: Position,
): Position | null => {
  const { base } = ctx;
  if (!base) return null;
  const required = BUILDINGS_CONFIG[type].requiredField;
  const taken = new Set(
    ctx.memory.tasks.map(({ target }) => `${target.x},${target.y}`),
  );
  let best: Position | null = null;
  let bestScore = Infinity;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const site = { x: base.x + dx, y: base.y + dy };
      const distance = manhattan(site, base);
      if (distance < 2 || distance > radius || !ctx.inside(site)) continue;
      const cell = ctx.known(site.x, site.y);
      if (!cell || !isBuildableTerrain(required, cell)) continue;
      if (ctx.occupied(site.x, site.y) || taken.has(`${site.x},${site.y}`)) {
        continue;
      }
      if (ctx.threatAt(site) > 0 || standCells(ctx, site).length === 0) {
        continue;
      }
      if (wouldBlock(ctx, site)) continue;
      const score =
        distance +
        (toward ? manhattan(site, toward) * 0.5 : 0) +
        tieBreak(`${type}:${site.x},${site.y}`, ctx.memory.seed);
      if (score < bestScore) {
        best = site;
        bestScore = score;
      }
    }
  }
  return best;
};

/** Рабочий свободен для новой работы: жив, без задачи и не на добыче. */
export const idleWorkers = (ctx: AiContext): CivilUnit[] =>
  ctx.workers.filter(
    worker =>
      isFree(ctx, worker.id) && !taskOf(ctx, worker.id) && !worker.workplaceId,
  );

/** Ближайший к точке свободный рабочий. */
export const nearestIdleWorker = (ctx: AiContext, site: Position) =>
  [...idleWorkers(ctx)].sort(
    (a, b) => manhattan(a, site) - manhattan(b, site),
  )[0] as CivilUnit | undefined;

/**
 * Шаг стройки: рядом — построить, иначе идти к площадке с задачей и
 * резервом ресурсов. Без очка стройки рабочий ждёт у площадки.
 */
export const buildStep = (
  ctx: AiContext,
  ruleId: string,
  group: Candidate['group'],
  worker: CivilUnit,
  type: BuildingType,
  site: Position,
  score: number,
  reason: string,
): Candidate[] => {
  const cost = BUILDINGS_CONFIG[type].cost;
  const task = {
    kind: 'build' as const,
    ruleId,
    unitId: worker.id,
    target: site,
    buildingType: type,
    reserve: cost,
  };
  const hasTask = taskOf(ctx, worker.id)?.buildingType === type;
  // Без своей задачи резерв ещё не отложен: нужен свободный бюджет.
  if (!hasTask && !affordable(ctx, cost, type)) return [];
  const basis = { building: type, x: site.x, y: site.y };

  if (isNear(worker, site)) {
    if (worker.buildPoints <= 0) return [];
    return [
      {
        ruleId,
        group,
        actorId: worker.id,
        action: {
          type: 'build',
          workerId: worker.id,
          buildingType: type,
          x: site.x,
          y: site.y,
        },
        score,
        reason,
        basis,
      },
    ];
  }

  const step = stepToward(ctx, worker, standCells(ctx, site));
  if (!step) return [];
  return [
    {
      ruleId,
      group,
      actorId: worker.id,
      action: { type: 'move', unitId: worker.id, ...step.next },
      score: score - 5,
      reason: `${reason}: иду к площадке`,
      task,
      basis,
    },
  ];
};

/** Продолжение своих задач стройки правилом, которое их создало. */
export const continueBuilds = (
  ctx: AiContext,
  ruleId: string,
  group: Candidate['group'],
  score: number,
): Candidate[] =>
  ctx.memory.tasks
    .filter(task => task.kind === 'build' && task.ruleId === ruleId)
    .flatMap(task => {
      const worker = ctx.workers.find(({ id }) => id === task.unitId);
      if (!worker || !isFree(ctx, worker.id) || !task.buildingType) return [];
      return buildStep(
        ctx,
        ruleId,
        group,
        worker,
        task.buildingType,
        task.target,
        score,
        'продолжаю стройку',
      );
    });
