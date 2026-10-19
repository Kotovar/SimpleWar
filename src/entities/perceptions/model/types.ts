import type {
  BuildingType,
  CellType,
  Owner,
  Position,
  UnitType,
} from '@shared/config';

/** Коды запомненной местности; `0` в маске — клетку никогда не видели. */
export const TERRAIN_CODES: readonly CellType[] = [
  'grass',
  'hill',
  'swamp',
  'mountain',
  'water',
  'forest',
  'gold',
];

/**
 * Память о вражеском объекте: что и где видели в последний раз. Не
 * обновляется скрытым перемещением или гибелью объекта.
 */
export type Contact = {
  id: string;
  kind: 'unit' | 'building';
  type: UnitType | BuildingType;
  owner: Owner;
  x: number;
  y: number;
  /** Наблюдённое здоровье на момент последнего обзора. */
  hp: number;
  maxHp: number;
  /** Круг ходов, в котором объект видели в последний раз. */
  seenTurn: number;
  /** Юнита замечал разведчик наблюдателя: Картография продлевает память. */
  byScout?: boolean;
};

/** Достоверность контакта: свежий или устаревший. */
export type ContactConfidence = 'recent' | 'stale';

/** Знания одного участника о мире. Индекс клетки — `y * width + x`. */
export type ParticipantKnowledge = {
  width: number;
  height: number;
  /** `1` — клетка видна сейчас. */
  visible: Uint8Array;
  /** Код запомненной местности (индекс в `TERRAIN_CODES` + 1); `0` — неизвестно. */
  terrain: Uint8Array;
  /** Память о вражеских объектах по ID, включая видимые сейчас. */
  contacts: Record<string, Contact>;
  /**
   * Известные отметки подготовленных ударов по ID орудия: только клетка
   * цели, без позиции орудия. Живут до удара или отмены.
   */
  strikes: Record<string, Position>;
};

/** Подготовленный удар в мире и может ли участник увидеть его отметку сейчас. */
export type StrikeSighting = Position & {
  id: string;
  /** Отметка открыта наблюдателю: публичная, своя/союзная или под разведчиком. */
  seen: boolean;
};

/** Состояние клетки для участника. */
export type CellKnowledge = 'visible' | 'explored' | 'unknown';
