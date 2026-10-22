import {
  CONTACT_MEMORY,
  type Cell,
  type Owner,
  type Position,
  type Site,
} from '@shared/config';
import {
  ROAD_BIT,
  TERRAIN_CODES,
  type CellKnowledge,
  type Contact,
  type ContactConfidence,
  type KnownSite,
  type ParticipantKnowledge,
  type StrikeSighting,
} from './types';

/** Что участник наблюдает прямо сейчас. */
export type ObservationInput = {
  /** Маска видимых клеток текущего обзора. */
  visible: Uint8Array;
  /** Настоящие клетки мира: запоминаются только видимые. */
  grid: Cell[][];
  /** Вражеские объекты в видимых клетках. */
  enemies: Omit<Contact, 'seenTurn'>[];
  /** Текущий круг ходов. */
  turn: number;
  /** Выбывшие участники: их объектов больше нет, память о них не нужна. */
  eliminated: readonly Owner[];
  /**
   * На сколько кругов дольше помнить юнита, замеченного разведчиком
   * (Картография); по умолчанию 0.
   */
  scoutMemoryBonus?: number;
  /** Все подготовленные удары мира; без списка отметок нет. */
  strikes?: StrikeSighting[];
  /** Находки мира: запоминаются только в видимых клетках, без награды тайника. */
  sites?: readonly Site[];
};

const sameMask = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const sameContact = (a: Contact | undefined, b: Contact) =>
  !!a &&
  a.x === b.x &&
  a.y === b.y &&
  a.hp === b.hp &&
  a.seenTurn === b.seenTurn &&
  a.owner === b.owner &&
  a.byScout === b.byScout;

/**
 * Обновляет знания участника по текущему наблюдению.
 *
 * Видимые клетки запоминают настоящую местность и дорогу, остальные
 * сохраняют прежний снимок: скрытая расчистка или дорога его не меняет. Контакт обновляется,
 * пока объект виден; видимая клетка без него опровергает контакт;
 * юнит вне обзора забывается по сроку, здание — только после проверки места.
 *
 * @param previous - Прежние знания; без них участник ничего не знает.
 * @param input - Текущее наблюдение.
 * @returns Новые знания; неизменившиеся части сохраняют прежние ссылки.
 */
export const observe = (
  previous: ParticipantKnowledge | undefined,
  {
    visible,
    grid,
    enemies,
    turn,
    eliminated,
    scoutMemoryBonus = 0,
    strikes: sightings = [],
    sites: worldSites = [],
  }: ObservationInput,
): ParticipantKnowledge => {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const fits =
    previous?.width === width &&
    previous.height === height &&
    previous.terrain.length === visible.length;
  const base = fits ? previous : undefined;

  let terrain = base?.terrain ?? new Uint8Array(width * height);
  let terrainCopied = !base;
  for (let index = 0; index < visible.length; index++) {
    if (!visible[index]) continue;
    const cell = grid[Math.floor(index / width)][index % width];
    const code =
      (TERRAIN_CODES.indexOf(cell.type) + 1) | (cell.road ? ROAD_BIT : 0);
    if (terrain[index] === code) continue;
    if (!terrainCopied) {
      terrain = terrain.slice();
      terrainCopied = true;
    }
    terrain[index] = code;
  }

  const contacts: Record<string, Contact> = {};
  const seen = new Set<string>();
  let changed = !base;
  for (const enemy of enemies) {
    const before = base?.contacts[enemy.id];
    // Отметка разведчика сохраняется, пока контакт помнится.
    const byScout = enemy.byScout || before?.byScout || undefined;
    const contact = { ...enemy, seenTurn: turn, byScout };
    contacts[enemy.id] = sameContact(before, contact) ? before! : contact;
    changed ||= contacts[enemy.id] !== before;
    seen.add(enemy.id);
  }

  const out = new Set(eliminated);
  for (const contact of Object.values(base?.contacts ?? {})) {
    if (seen.has(contact.id)) continue;
    const refuted = visible[contact.y * width + contact.x] === 1;
    const forgotten =
      contact.kind === 'unit' &&
      turn - contact.seenTurn >
        CONTACT_MEMORY.forgetAfter + (contact.byScout ? scoutMemoryBonus : 0);
    if (refuted || forgotten || out.has(contact.owner)) {
      changed = true;
      continue;
    }
    contacts[contact.id] = contact;
  }

  // Раз увиденная отметка помнится до удара или отмены.
  const strikes: Record<string, Position> = {};
  for (const { id, x, y, seen } of sightings) {
    const before = base?.strikes[id];
    if (before && before.x === x && before.y === y) strikes[id] = before;
    else if (seen) strikes[id] = { x, y };
  }
  const prevStrikes = base?.strikes ?? {};
  const strikesChanged =
    !base ||
    Object.keys(strikes).length !== Object.keys(prevStrikes).length ||
    Object.keys(strikes).some(id => strikes[id] !== prevStrikes[id]);

  const sites: Record<string, KnownSite> = {};
  const prevSites = base?.sites ?? {};
  for (const site of worldSites) {
    const { id, x, y } = site;
    if (visible[y * width + x] !== 1) continue;
    const known: KnownSite =
      site.type === 'camp'
        ? { id, x, y, type: 'camp', hiresLeft: site.hiresLeft }
        : { id, x, y, type: site.type };
    const before = prevSites[id];
    sites[id] =
      before &&
      before.type === known.type &&
      before.x === x &&
      before.y === y &&
      (before.type !== 'camp' ||
        (known.type === 'camp' && before.hiresLeft === known.hiresLeft))
        ? before
        : known;
  }
  for (const known of Object.values(prevSites)) {
    if (!sites[known.id] && visible[known.y * width + known.x] !== 1) {
      sites[known.id] = known;
    }
  }
  const sitesChanged =
    !base ||
    Object.keys(sites).length !== Object.keys(prevSites).length ||
    Object.keys(sites).some(id => sites[id] !== prevSites[id]);

  return {
    width,
    height,
    visible: base && sameMask(base.visible, visible) ? base.visible : visible,
    terrain,
    contacts: changed ? contacts : base!.contacts,
    sites: sitesChanged ? sites : prevSites,
    strikes: strikesChanged ? strikes : prevStrikes,
  };
};

/**
 * Состояние клетки в знаниях участника.
 *
 * @returns Видима, разведана, но не видна, или никогда не разведана.
 */
export const getCellKnowledge = (
  knowledge: ParticipantKnowledge | undefined,
  x: number,
  y: number,
): CellKnowledge => {
  if (!knowledge || x < 0 || y < 0 || x >= knowledge.width) return 'unknown';
  const index = y * knowledge.width + x;
  if (knowledge.visible[index]) return 'visible';
  return knowledge.terrain[index] ? 'explored' : 'unknown';
};

/**
 * Запомненная местность клетки.
 *
 * @returns Тип местности по последнему наблюдению или `null`, если её не видели.
 */
export const getKnownCellType = (
  knowledge: Pick<ParticipantKnowledge, 'width' | 'terrain'> | undefined,
  x: number,
  y: number,
) => {
  if (!knowledge || x < 0 || y < 0 || x >= knowledge.width) return null;
  const code = knowledge.terrain[y * knowledge.width + x] & ~ROAD_BIT;
  return code ? TERRAIN_CODES[code - 1] : null;
};

/**
 * Видел ли участник дорогу на клетке при последнем обзоре.
 */
export const isKnownRoad = (
  knowledge: Pick<ParticipantKnowledge, 'width' | 'terrain'> | undefined,
  x: number,
  y: number,
) =>
  !!knowledge &&
  x >= 0 &&
  y >= 0 &&
  x < knowledge.width &&
  (knowledge.terrain[y * knowledge.width + x] & ROAD_BIT) !== 0;

/**
 * Достоверность контакта по его возрасту.
 *
 * @param contact - Память об объекте.
 * @param turn - Текущий круг ходов.
 */
export const getContactConfidence = (
  contact: Contact,
  turn: number,
): ContactConfidence =>
  turn - contact.seenTurn <= CONTACT_MEMORY.staleAfter ? 'recent' : 'stale';
