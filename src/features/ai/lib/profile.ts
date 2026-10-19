import {
  AI_CONFIG,
  AI_PROFILES,
  type AiProfile,
  type RuleGroup,
  type StrategyId,
} from '@shared/config';

/**
 * Настройки ИИ под профиль: те же правила и стратегии, другие веса групп,
 * прибавки к оценкам стратегий и пороги атаки. Без профиля — нейтральные.
 *
 * @param profile - Профиль стратегии ИИ.
 */
export const profileConfig = (profile?: AiProfile): typeof AI_CONFIG => {
  if (!profile) return AI_CONFIG;
  const { groups, strategyBias, tune } = AI_PROFILES[profile];
  const strategyWeights = Object.fromEntries(
    Object.entries(AI_CONFIG.strategyWeights).map(([id, weights]) => [
      id,
      Object.fromEntries(
        Object.entries(weights).map(([group, weight]) => [
          group,
          weight * groups[group as RuleGroup],
        ]),
      ),
    ]),
  ) as Record<StrategyId, Record<RuleGroup, number>>;
  return {
    ...AI_CONFIG,
    ...tune,
    profile,
    strategyBias,
    strategyWeights,
  };
};
