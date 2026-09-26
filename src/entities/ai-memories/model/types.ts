import type { BuildingType, Cost, Position, StrategyId } from '@shared/config';

/** Вид задачи: стройка, разведка или ремонт. */
export type AiTaskKind = 'build' | 'scout';

/**
 * Задача ИИ на несколько ходов: исполнитель, цель, резерв ресурсов и срок
 * пересмотра. Один юнит — в одной задаче.
 */
export type AiTask = {
  id: string;
  kind: AiTaskKind;
  /** Правило, создавшее задачу. */
  ruleId: string;
  unitId: string;
  target: Position;
  buildingType?: BuildingType;
  /** Отложенные на задачу ресурсы: другие правила их не тратят. */
  reserve: Cost;
  createdTurn: number;
  /** После этого круга задача пересматривается и может быть отменена. */
  reviewTurn: number;
};

/** Фаза операции ударной группы (S13). */
export type OperationPhase = 'gather' | 'advance' | 'engage' | 'retreat';

/** Операция ударной группы: сбор → движение → бой → отход. */
export type AiOperation = {
  phase: OperationPhase;
  /** Цель наступления: известное вражеское здание, контакт или граница. */
  target: Position | null;
  /** Место сбора у своей базы. */
  rally: Position | null;
  /** Круг, с которого длится текущая фаза. */
  since: number;
};

/** Память ИИ одного участника. Другие участники её не читают. */
export type AiMemory = {
  /** Сид разрешения равных оценок. */
  seed: number;
  strategy: StrategyId;
  strategyScore: number;
  /** Круг, с которого держится стратегия. */
  strategySince: number;
  tasks: AiTask[];
  nextTaskId: number;
  operation: AiOperation;
  /** Юниты гарнизона: не входят в ударную группу. */
  garrison: string[];
  /** Где работал рабочий: для восстановления после потери здания (W09). */
  lastWorkplace: Record<
    string,
    { buildingId: string; type: BuildingType } & Position
  >;
};
