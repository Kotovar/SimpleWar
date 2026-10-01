import type { AiProfile } from './aiProfiles';

/** Стратегии ИИ из каталога G01–G12. */
export type StrategyId =
  | 'G01'
  | 'G02'
  | 'G03'
  | 'G04'
  | 'G05'
  | 'G06'
  | 'G07'
  | 'G08'
  | 'G09'
  | 'G10'
  | 'G11'
  | 'G12';

/**
 * Группы правил, на которые стратегия влияет весом: экономика, стройка,
 * найм, разведка, наступление, оборона.
 */
export type RuleGroup =
  | 'economy'
  | 'build'
  | 'hire'
  | 'scout'
  | 'attack'
  | 'defense'
  | 'research';

/** Названия стратегий для журнала решений. */
export const STRATEGY_NAME: Record<StrategyId, string> = {
  G01: 'Срочная оборона',
  G02: 'Восстановить добычу',
  G03: 'Расширить добычу',
  G04: 'Армия и население',
  G05: 'Поиск вражеской базы',
  G06: 'Поиск ресурса',
  G07: 'Проверка старого контакта',
  G08: 'Наступление',
  G09: 'Рейд',
  G10: 'Гарнизон и башня',
  G11: 'Отход и перегруппировка',
  G12: 'Исследования',
};

export const flatWeights = (value: number): Record<RuleGroup, number> => ({
  economy: value,
  build: value,
  hire: value,
  scout: value,
  attack: value,
  defense: value,
  research: value,
});

/**
 * Настройки ИИ: пороги и веса, а не код поведения. Старт; подбираются в S21.
 * Сложность S17a меняет только стартовые условия ИИ, не эти веса.
 */
export const AI_CONFIG = {
  /** Предел команд за ход: ход не зависает при ошибке правила. */
  maxCommandsPerTurn: 80,
  /** Сколько отказов подряд завершают ход. */
  maxConsecutiveFailures: 6,
  /**
   * Порция вычислений хода, мс: после действия, если прошло столько,
   * управление отдаётся браузеру. Один дорогой шаг она не прерывает.
   */
  yieldBudgetMs: 8,
  /** Минимальная полезность, ниже которой действие не выполняется. */
  minScore: 1,
  /** Сколько ходов держать стратегию до обычной смены. */
  strategyHold: 3,
  /** Насколько новая стратегия должна быть лучше текущей. */
  strategySwitchMargin: 15,
  /** Радиус тревоги вокруг ратуши, Manhattan. */
  alertRadius: 6,
  /** Сколько рабочих держать: на каждое место добычи и на стройку. */
  workerTarget: { min: 3, max: 6 },
  /** Размер ударной группы для наступления и тайм-аут её сбора. */
  strikeGroup: { size: 4, raidSize: 2, gatherTimeout: 8, readyShare: 0.75 },
  /** Размер гарнизона при известном направлении угрозы. */
  garrisonSize: 2,
  /** Соотношение сил, при котором группа отходит (G11). */
  retreatRatio: 0.7,
  /** Соотношение сил для наступления (G08). */
  attackRatio: 1.3,
  /** Доля HP, ниже которой юнит отходит (M06, A07). */
  lowHp: 0.35,
  /** Доля HP, ниже которой здание стоит чинить (W08). */
  repairBelow: 0.7,
  /** Вес устаревшего контакта в оценке угрозы по достоверности. */
  contactWeight: { recent: 0.6, stale: 0.3 },
  /** Срок пересмотра задач стройки и разведки, ходы. */
  taskReview: 8,
  /** Радиус поиска ресурса рабочим до появления разведки (W04). */
  workerScoutRadius: 10,
  /** Расширение добычи: +1 рудник и лесопилка каждые `every` ходов, до `max`. */
  expansion: { every: 20, max: 3 },
  /** Желаемая армия: `base` + 1 каждые `every` ходов, до `max`. */
  army: { base: 2, every: 5, max: 10 },
  /** С какого хода копить на кузницу без стратегии исследований (G12). */
  forgeTurn: 25,
  /** Выгода расчистки: насколько путь должен стать короче (X01). */
  clearingGain: 4,
  /** Профиль стратегии (S17); `null` — нейтральные веса. */
  profile: null as AiProfile | null,
  /** Прибавка профиля к ненулевой оценке стратегии. */
  strategyBias: {} as Partial<Record<StrategyId, number>>,
  /** Веса групп правил под каждой стратегией. */
  strategyWeights: {
    G01: {
      ...flatWeights(0.6),
      defense: 2.5,
      hire: 1.5,
      economy: 0.4,
      scout: 0.2,
      research: 0.2,
    },
    G02: { ...flatWeights(1), economy: 1.8, build: 1.3, hire: 1.1 },
    G03: { ...flatWeights(1), economy: 1.4, build: 1.5 },
    G04: { ...flatWeights(1), hire: 1.7, build: 1.3 },
    G05: { ...flatWeights(1), scout: 1.8 },
    G06: { ...flatWeights(1), scout: 1.5, economy: 1.2 },
    G07: { ...flatWeights(1), scout: 1.5 },
    G08: { ...flatWeights(1), attack: 1.8, hire: 1.2, scout: 1.2 },
    G09: { ...flatWeights(1), attack: 1.5 },
    G10: { ...flatWeights(1), defense: 1.6, build: 1.2 },
    G11: { ...flatWeights(1), defense: 1.8, attack: 0.5 },
    G12: { ...flatWeights(1), research: 1.8, build: 1.2 },
  } satisfies Record<StrategyId, Record<RuleGroup, number>>,
};
