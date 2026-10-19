import type { ParticipantId } from '@shared/config';

/** Лимит записей решений ИИ: их много, игровые события они не вытесняют. */
export const DECISION_LIMIT = 400;

/** Рассмотренная альтернатива решения ИИ. */
export type DecisionAlternative = {
  ruleId: string;
  score: number;
  reason: string;
  actorId: string | null;
};

/**
 * Запись решения ИИ для журнала разработчика. Снимок оснований на момент
 * выбора: разбирается и после гибели цели. Видна только в режиме отладки.
 */
export type AiDecisionRecord = {
  id: number;
  gameId: number;
  turn: number;
  /** ИИ-участник, принявший решение. */
  actor: ParticipantId;
  /** Номер шага внутри хода. */
  step: number;
  strategy: string;
  ruleId: string;
  /** Юнит или здание-исполнитель; `null` — решение стороны целиком. */
  actorId: string | null;
  /** Задача, к которой относится решение. */
  taskId?: string;
  /** Кратко: что сделано и с какой целью. */
  action: string;
  reason: string;
  /** Наблюдённые основания выбора. */
  basis: Record<string, string | number>;
  alternatives: DecisionAlternative[];
  /** `ok`, код отказа или `endTurn`. */
  result: string;
};

/** Новое решение; служебные поля журнал заполняет сам. */
export type AiDecisionInput = Omit<AiDecisionRecord, 'id' | 'gameId'>;
