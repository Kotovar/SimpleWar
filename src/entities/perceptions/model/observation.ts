import type {
  Building,
  CellType,
  ParticipantId,
  PopulationCap,
  Position,
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
  /** Свои запасы золота и дерева. */
  stock: Resources;
  /** Своё население: занято и предел. */
  population: PopulationCap;
  /** Враги в обзоре: только наблюдаемые поля. */
  visibleEnemies: Omit<Contact, 'seenTurn'>[];
  /** Известная местность, `knownTerrain[y][x]`; `null` — не разведано. */
  knownTerrain: (CellType | null)[][];
  /** Видимость клеток сейчас, `visible[y][x]`. */
  visible: boolean[][];
  /** Обнаруженные золото и лес. */
  resources: (Position & { type: 'gold' | 'forest' })[];
  /** Память об объектах вне обзора. */
  contacts: RememberedContact[];
};
