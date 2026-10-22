import type {
  Building,
  CellType,
  ParticipantId,
  PopulationCap,
  Position,
  ResearchType,
  Resources,
  Unit,
} from '@shared/config';
import type { Contact, ContactConfidence } from './types';

/** Устаревший контакт: объект вне обзора с оценкой достоверности. */
export type RememberedContact = Contact & { confidence: ContactConfidence };

/**
 * Наблюдение участника — всё, что он вправе знать о мире. Не содержит
 * скрытых ID, ресурсов и улучшений других сторон, мест их баз из генератора.
 * Тип лежит рядом со знаниями: его читают и сборщик наблюдения, и ИИ.
 */
export type Observation = {
  participant: ParticipantId;
  turn: number;
  width: number;
  height: number;
  ownUnits: Unit[];
  ownBuildings: Building[];
  /** Объекты союзников под общим обзором; приказами управляет только владелец. */
  alliedUnits?: Unit[];
  alliedBuildings?: Building[];
  /** Свои запасы золота и дерева. */
  stock: Resources;
  /** Своё население: занято и предел. */
  population: PopulationCap;
  /**
   * Враги в обзоре: только наблюдаемые поля. `armorBonus` — видимый бонус
   * Строя (значок на карте виден всем): копейщик с видимым соседом.
   */
  visibleEnemies: (Omit<Contact, 'seenTurn'> & { armorBonus?: number })[];
  /** Известная местность, `knownTerrain[y][x]`; `null` — не разведано. */
  knownTerrain: (CellType | null)[][];
  /** Известные дороги, `knownRoads[y][x]`; без поля дорог не знают. */
  knownRoads?: boolean[][];
  /** Видимость клеток сейчас, `visible[y][x]`. */
  visible: boolean[][];
  /** Невыбывшие соперники: порядок ходов и выбывание публичны. */
  opponents: ParticipantId[];
  /** Обнаруженные золото и лес. */
  resources: (Position & { type: 'gold' | 'forest' })[];
  /** Память об объектах вне обзора. */
  contacts: RememberedContact[];
  /**
   * Известные участнику отметки подготовленных ударов осады: только клетка
   * цели, без позиции, типа и HP орудия. Скрытая наводка прячет чужие.
   */
  strikes: Position[];
  /** Изученные участником исследования. */
  researched: ResearchType[];
  /** Своё текущее исследование в кузнице. */
  researching: ResearchType | null;
};
