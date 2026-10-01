import {
  RESEARCH_CONFIG,
  RESEARCH_TYPES,
  type ResearchType,
} from '@shared/config';
import type { StrategyScore } from '../model/types';
import type { AiContext } from './context';
import { nearest } from './facts';
import { manhattan } from './geometry';

/**
 * Польза исследования по составу армии, доходу и угрозе; 0 — бесполезно
 * сейчас. Только своё и наблюдённое: скрытого знания нет.
 */
export const researchValue = (ctx: AiContext, type: ResearchType): number => {
  const count = (unit: string) =>
    ctx.military.filter(({ type: own }) => own === unit).length;
  const foes = [...ctx.enemies, ...ctx.remembered];
  switch (type) {
    case 'formation': {
      const spears = count('spearman');
      if (spears < 2) return 0;
      const riders = foes.some(({ type: foe }) => foe === 'rider') ? 10 : 0;
      return 15 + spears * 5 + riders;
    }
    case 'cartography': {
      const units = foes.filter(({ kind }) => kind === 'unit').length;
      return count('scout') ? 10 + Math.min(5, units) * 3 : 0;
    }
    case 'engineering': {
      const { base } = ctx;
      const threat =
        base &&
        nearest(
          base,
          foes.filter(({ armed, kind }) => armed && kind === 'unit'),
        );
      return threat && manhattan(threat, base) <= ctx.config.alertRadius * 2
        ? 25
        : 0;
    }
    case 'hiddenAiming': {
      const siege = count('siege');
      return siege ? 15 + siege * 8 : 0;
    }
    case 'artel': {
      const assigned = ctx.workers.filter(w => w.workplaceId).length;
      return assigned >= 2 ? 8 + assigned * 4 : 0;
    }
  }
};

/** Самое полезное ещё не изученное исследование. */
export const bestResearch = (
  ctx: AiContext,
): { type: ResearchType; value: number } | null => {
  const researched = new Set(ctx.obs.researched);
  const options = RESEARCH_TYPES.filter(type => !researched.has(type))
    .map(type => ({ type, value: researchValue(ctx, type) }))
    .filter(({ value }) => value > 0)
    .sort((a, b) => b.value - a.value);
  return options[0] ?? null;
};

/**
 * G12: есть полезное исследование — с кузницей оценка растёт с пользой;
 * без кузницы — только когда армия и доход уже есть.
 */
export const researchStrategy = (ctx: AiContext): Omit<StrategyScore, 'id'> => {
  const best = bestResearch(ctx);
  if (ctx.obs.researching || !best) {
    return { score: 0, reason: 'исследовать нечего или кузница занята' };
  }
  const name = RESEARCH_CONFIG[best.type].name;
  const hasForge = ctx.obs.ownBuildings.some(({ type }) => type === 'forge');
  if (hasForge)
    return { score: 25 + best.value / 2, reason: `польза: ${name}` };
  // Кузница — когда армия и доход уже есть: экономика важнее.
  return ctx.military.length >= 3 && ctx.income.gold + ctx.income.wood >= 15
    ? { score: 25, reason: `нужна кузница: ${name}` }
    : { score: 0, reason: 'кузница пока не по силам' };
};
