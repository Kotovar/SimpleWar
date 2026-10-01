import {
  BUILDINGS_CONFIG,
  type BuildingType,
  type CivilUnit,
  type Position,
} from '@shared/config';
import { isBuildableTerrain } from '@shared/lib';
import type { Candidate } from '../../model/types';
import type { AiContext } from '../context';
import { isNear } from '../facts';
import { affordable } from '../saving';
import { manhattan, tieBreak } from '../geometry';
import { standCells, stepToward } from '../movement';
import { isFree, taskOf, wouldBlock } from './common';

/**
 * Клетка годится под здание: известная подходящая местность, не занята
 * и не обещана задаче, без угрозы, есть где встать рабочему, не перекрывает
 * последний проход.
 */
export const siteOk = (ctx: AiContext, type: BuildingType, site: Position) => {
  if (!ctx.inside(site)) return false;
  const cell = ctx.known(site.x, site.y);
  const required = BUILDINGS_CONFIG[type].requiredField;
  if (!cell || !isBuildableTerrain(required, cell)) return false;
  if (ctx.occupied(site.x, site.y)) return false;
  if (
    ctx.memory.tasks.some(({ target: t }) => t.x === site.x && t.y === site.y)
  )
    return false;
  return (
    ctx.threatAt(site) === 0 &&
    standCells(ctx, site).length > 0 &&
    !wouldBlock(ctx, site)
  );
};

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
  let best: Position | null = null;
  let bestScore = Infinity;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const site = { x: base.x + dx, y: base.y + dy };
      const distance = manhattan(site, base);
      if (distance < 2 || distance > radius || !siteOk(ctx, type, site)) {
        continue;
      }
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
