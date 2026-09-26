import { CONTACT_MEMORY, type Cell, type Owner } from '@shared/config';
import {
  TERRAIN_CODES,
  type CellKnowledge,
  type Contact,
  type ContactConfidence,
  type ParticipantKnowledge,
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
};

const sameMask = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const sameContact = (a: Contact | undefined, b: Contact) =>
  !!a &&
  a.x === b.x &&
  a.y === b.y &&
  a.hp === b.hp &&
  a.seenTurn === b.seenTurn &&
  a.owner === b.owner;

/**
 * Обновляет знания участника по текущему наблюдению.
 *
 * Видимые клетки запоминают настоящую местность, остальные сохраняют
 * прежний снимок: скрытая расчистка его не меняет. Контакт обновляется,
 * пока объект виден; видимая клетка без него опровергает контакт;
 * юнит вне обзора забывается по сроку, здание — только после проверки места.
 *
 * @param previous - Прежние знания; без них участник ничего не знает.
 * @param input - Текущее наблюдение.
 * @returns Новые знания; неизменившиеся части сохраняют прежние ссылки.
 */
export const observe = (
  previous: ParticipantKnowledge | undefined,
  { visible, grid, enemies, turn, eliminated }: ObservationInput,
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
    const code = TERRAIN_CODES.indexOf(cell.type) + 1;
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
    const contact = { ...enemy, seenTurn: turn };
    const before = base?.contacts[enemy.id];
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
      turn - contact.seenTurn > CONTACT_MEMORY.forgetAfter;
    if (refuted || forgotten || out.has(contact.owner)) {
      changed = true;
      continue;
    }
    contacts[contact.id] = contact;
  }

  return {
    width,
    height,
    visible: base && sameMask(base.visible, visible) ? base.visible : visible,
    terrain,
    contacts: changed ? contacts : base!.contacts,
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
  const code = knowledge.terrain[y * knowledge.width + x];
  return code ? TERRAIN_CODES[code - 1] : null;
};

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
