import type {
  BuildingType,
  Position,
  RuleGroup,
  StrategyId,
  UnitType,
} from '@shared/config';
import type { AiMemory, AiTask } from '@entities/ai-memories';
import type { AiContext } from '../lib/context';

/**
 * Действие ИИ — параметры одной общей команды S02. Участник подставляется
 * исполнителем. `wait` — осознанный пропуск: исполнитель больше не
 * рассматривается в этом ходу.
 */
export type AiAction =
  | { type: 'move'; unitId: string; x: number; y: number }
  | { type: 'attack'; attackerId: string; targetId: string }
  | {
      type: 'build';
      workerId: string;
      buildingType: BuildingType;
      x: number;
      y: number;
    }
  | {
      type: 'spawn';
      buildingId: string;
      unitType: UnitType;
      x: number;
      y: number;
    }
  | { type: 'assign'; workerId: string; buildingId: string }
  | { type: 'unassign'; workerId: string }
  | { type: 'repair'; workerId: string; buildingId: string }
  | { type: 'clearForest'; workerId: string; x: number; y: number }
  | { type: 'demolish'; buildingId: string }
  | { type: 'wait'; actorId: string };

/** Предложение правила: действие, полезность и причина. */
export type Candidate = {
  ruleId: string;
  group: RuleGroup;
  /** Юнит или здание-исполнитель; `null` — действие стороны. */
  actorId: string | null;
  action: AiAction;
  /** Полезность до веса стратегии; чем больше, тем важнее. */
  score: number;
  reason: string;
  /** Задача, которую нужно создать или продолжить. */
  task?: Omit<AiTask, 'id' | 'createdTurn' | 'reviewTurn'>;
  /** Урон, который действие добавит к общему фокусу. */
  damage?: { targetId: string; amount: number };
  /** Наблюдённые основания для журнала. */
  basis?: Record<string, string | number>;
};

/**
 * Правило ИИ: стабильный ID, группа для весов стратегии и оценка.
 * Добавление правила — регистрация в реестре, без правки цикла хода.
 */
export type AiRule = {
  id: string;
  group: RuleGroup;
  /** Кратко, для журнала. */
  title: string;
  evaluate: (ctx: AiContext) => Candidate[];
};

/** Оценка стратегии: полезность и причина. */
export type StrategyScore = {
  id: StrategyId;
  score: number;
  reason: string;
};

/** Состояние внутри одного хода: не переживает конец хода. */
export type TurnState = {
  /** Исполнители, которые больше не действуют в этом ходу. */
  done: Set<string>;
  /** Ключи действий, отклонённых командой в этом ходу. */
  failed: Set<string>;
  /** Запланированный урон по целям: общий фокус огня. */
  plannedDamage: Map<string, number>;
  step: number;
};

export type { AiMemory };

/** Итог выбора шага: действие с альтернативами либо конец хода. */
export type Decision = {
  chosen: (Candidate & { weighted: number }) | null;
  alternatives: (Candidate & { weighted: number })[];
  /** Почему ход завершается, если действия нет. */
  endReason?: string;
};

/** Точка на карте с ценой. */
export type CostedCell = Position & { cost: number };
