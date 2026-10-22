import type {
  BuildingType,
  CellType,
  Owner,
  Position,
  SiteType,
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

/** Бит дороги в коде запомненной местности; младшие биты — местность. */
export const ROAD_BIT = 0x80;

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

/** Наблюдаемая находка; содержимое тайника раскрывается только при сборе. */
export type KnownSite = Position & { id: string } & (
    | { type: 'camp'; hiresLeft: number }
    | { type: Exclude<SiteType, 'camp'> }
  );

/** Знания одного участника о мире. Индекс клетки — `y * width + x`. */
export type ParticipantKnowledge = {
  width: number;
  height: number;
  /** `1` — клетка видна сейчас. */
  visible: Uint8Array;
  /**
   * Код запомненной местности (индекс в `TERRAIN_CODES` + 1) с `ROAD_BIT`,
   * если на клетке видели дорогу; `0` — неизвестно.
   */
  terrain: Uint8Array;
  /** Память о вражеских объектах по ID, включая видимые сейчас. */
  contacts: Record<string, Contact>;
  /** Находки по последнему обзору; скрытое исчезновение не меняет память. */
  sites: Record<string, KnownSite>;
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
