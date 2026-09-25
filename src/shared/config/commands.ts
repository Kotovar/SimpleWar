import type { ParticipantId } from './gameLoop';

/** Игровые команды, общие для интерфейса и ИИ. */
export type CommandType =
  | 'start'
  | 'move'
  | 'attack'
  | 'build'
  | 'spawn'
  | 'endTurn';

/** Причина отказа команды. */
export type RejectionCode =
  | 'phase'
  | 'turn'
  | 'notFound'
  | 'owner'
  | 'actionType'
  | 'bounds'
  | 'terrain'
  | 'occupied'
  | 'distance'
  | 'path'
  | 'points'
  | 'resources'
  | 'population'
  | 'target'
  | 'map'
  | 'failure';

/**
 * Текст отказа для игрока. Формулировки общие и не раскрывают скрытый мир:
 * подробности — только в `detail` для отладки.
 */
export const REJECTION_MESSAGE: Record<RejectionCode, string> = {
  phase: 'Партия сейчас не идёт',
  turn: 'Сейчас не ваш ход',
  notFound: 'Объект недоступен',
  owner: 'Этим объектом управляет другой участник',
  actionType: 'Этот объект не может выполнить такое действие',
  bounds: 'Клетка за пределами карты',
  terrain: 'Неподходящая местность',
  occupied: 'Клетка занята',
  distance: 'Слишком далеко',
  path: 'Нет пути',
  points: 'Не хватает очков действий',
  resources: 'Недостаточно ресурсов',
  population: 'Не хватает лимита населения',
  target: 'Недопустимая цель',
  map: 'Не удалось подготовить карту',
  failure: 'Внутренняя ошибка игры',
};

/**
 * Отказ команды. `rejected` — ожидаемое нарушение правил,
 * `failure` — сбой кода, которого при верных правилах быть не должно.
 */
export type CommandRejection = {
  ok: false;
  kind: 'rejected' | 'failure';
  code: RejectionCode;
  message: string;
  detail?: string;
};

/** Итог команды: успех либо отказ без изменения состояния. */
export type CommandResult = { ok: true } | CommandRejection;

/** Кто и что сделал; `null` — служебное действие партии (старт). */
export type CommandMeta = {
  type: CommandType;
  actor: ParticipantId | null;
  details?: Record<string, string | number>;
};
