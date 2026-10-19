import {
  RESEARCH_CONFIG,
  UNITS_CONFIG,
  type ResearchType,
} from '@shared/config';
import type { AiRule } from '../../model/types';
import type { AiContext } from '../context';
import { baseAlarm } from '../facts';
import { bestResearch } from '../researchValue';
import { affordable } from '../saving';

export { bestResearch, researchValue } from '../researchValue';

/** Мирные исследования: во время нападения на них резерв не тратится. */
const PEACEFUL: ResearchType[] = ['cartography', 'artel'];

/**
 * Резерв обороны: при угрозе ратуше мирное улучшение не запускается,
 * военное — только если после него остаются деньги на двух мечников.
 */
export const keepsDefenseReserve = (ctx: AiContext, type: ResearchType) => {
  if (!baseAlarm(ctx).length) return true;
  if (PEACEFUL.includes(type)) return false;
  const { cost } = RESEARCH_CONFIG[type];
  const soldier = UNITS_CONFIG.swordsman.cost;
  return (
    ctx.budget.gold - cost.gold >= soldier.gold * 2 &&
    ctx.budget.wood - cost.wood >= soldier.wood * 2
  );
};

/**
 * N04: есть кузница, нет текущей работы и полезное исследование по
 * карману — запустить. Цена не вытесняет накопление на найм и добычу.
 */
export const N04: AiRule = {
  id: 'N04',
  group: 'research',
  title: 'Исследование',
  evaluate: ctx => {
    if (ctx.obs.researching) return [];
    const forge = ctx.obs.ownBuildings.find(({ type }) => type === 'forge');
    const best = bestResearch(ctx);
    if (!forge || !best) return [];
    const { cost, name } = RESEARCH_CONFIG[best.type];
    if (!affordable(ctx, cost, 'research')) return [];
    if (!keepsDefenseReserve(ctx, best.type)) return [];
    return [
      {
        ruleId: 'N04',
        group: 'research',
        actorId: forge.id,
        action: { type: 'startResearch', research: best.type },
        score: Math.min(60, 25 + best.value),
        reason: `полезно сейчас: ${name}`,
        basis: { research: best.type, value: best.value },
      },
    ];
  },
};
