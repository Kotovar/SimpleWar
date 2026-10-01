import { AI_CONFIG, flatWeights, type RuleGroup, type StrategyId } from './ai';

/** Профиль стратегии ИИ: веса одного каталога, а не отдельный ИИ. */
export type AiProfile = 'balanced' | 'aggressive' | 'economic' | 'defensive';

/** Уровень сложности: только стартовые условия ИИ. */
export type AiDifficulty = 'easy' | 'normal' | 'hard';

/** Настройки конкретного ИИ на партию. */
export type AiSetup = { profile: AiProfile; difficulty: AiDifficulty };

/** Настройки ИИ по умолчанию. */
export const DEFAULT_AI_SETUP: AiSetup = {
  profile: 'balanced',
  difficulty: 'normal',
};

/** Пороги, которые профиль задаёт вместо общих. */
type AiTune = Partial<
  Pick<
    typeof AI_CONFIG,
    | 'attackRatio'
    | 'strikeGroup'
    | 'garrisonSize'
    | 'workerTarget'
    | 'expansion'
    | 'army'
    | 'forgeTurn'
  >
>;

/**
 * Профили (S17): множители весов групп правил, прибавки к оценкам стратегий
 * и пороги — размер армии, гарнизон, расширение добычи, срок кузницы, выход
 * в атаку. Каждый профиль защищается, строит экономику, исследует и
 * атакует — меняется только, когда и насколько охотно. Числа — в S21.
 */
export const AI_PROFILES: Record<
  AiProfile,
  {
    name: string;
    groups: Record<RuleGroup, number>;
    strategyBias: Partial<Record<StrategyId, number>>;
    tune: AiTune;
  }
> = {
  // Общие настройки без уклона.
  balanced: {
    name: 'Сбалансированный',
    groups: flatWeights(1),
    strategyBias: {},
    tune: {},
  },
  aggressive: {
    name: 'Завоеватель',
    groups: {
      ...flatWeights(1),
      attack: 1.3,
      hire: 1.2,
      economy: 0.9,
      research: 0.8,
    },
    strategyBias: { G08: 15, G09: 15, G04: 10, G12: -10 },
    tune: {
      attackRatio: 1.1,
      strikeGroup: { ...AI_CONFIG.strikeGroup, size: 3, gatherTimeout: 6 },
      garrisonSize: 1,
      army: { base: 3, every: 4, max: 12 },
      expansion: { every: 25, max: 2 },
      forgeTurn: 35,
    },
  },
  economic: {
    name: 'Строитель',
    groups: { ...flatWeights(1), economy: 1.2, build: 1.15, research: 1.3 },
    strategyBias: { G02: 10, G03: 15, G12: 15 },
    tune: {
      workerTarget: { min: 4, max: 8 },
      expansion: { every: 12, max: 4 },
      army: { base: 2, every: 6, max: 10 },
      forgeTurn: 15,
    },
  },
  defensive: {
    name: 'Защитник',
    groups: { ...flatWeights(1), defense: 1.3, build: 1.1, attack: 0.85 },
    strategyBias: { G10: 20, G12: 5 },
    // Выход в атаку: перевес либо долгий сбор крупной группы.
    tune: {
      attackRatio: 1.6,
      strikeGroup: { ...AI_CONFIG.strikeGroup, size: 5, gatherTimeout: 12 },
      garrisonSize: 3,
      army: { base: 3, every: 5, max: 12 },
      forgeTurn: 20,
    },
  },
};

/** Порядок профилей в меню. */
export const AI_PROFILE_TYPES = Object.keys(AI_PROFILES) as AiProfile[];

/**
 * Пресеты сложности (S17a): прибавка к стартовым запасам ИИ, один раз при
 * создании партии. Обычный старт симметричен игроку. Числа — в S21.
 */
export const AI_DIFFICULTY: Record<
  AiDifficulty,
  { name: string; stockBonus: { gold: number; wood: number } }
> = {
  easy: { name: 'Лёгкий', stockBonus: { gold: -80, wood: -60 } },
  normal: { name: 'Обычный', stockBonus: { gold: 0, wood: 0 } },
  hard: { name: 'Сложный', stockBonus: { gold: 150, wood: 100 } },
};

/** Порядок уровней в меню. */
export const AI_DIFFICULTY_TYPES = Object.keys(AI_DIFFICULTY) as AiDifficulty[];
