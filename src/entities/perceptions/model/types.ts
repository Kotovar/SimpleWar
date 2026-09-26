import type { BuildingType, CellType, Owner, UnitType } from '@shared/config';

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
};

/** Состояние клетки для участника. */
export type CellKnowledge = 'visible' | 'explored' | 'unknown';
