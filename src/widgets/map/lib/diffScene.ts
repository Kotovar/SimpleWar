import type {
  Building,
  BuildingType,
  Owner,
  Unit,
  UnitType,
} from '@shared/config';
import { isHostile } from '@shared/lib';

/** Что слой карты помнит об объекте с прошлого кадра. */
export type Tracked = {
  x: number;
  y: number;
  hp: number;
  /** Очки атаки: их трата — признак удара этого объекта. */
  attackPoints?: number;
  building: boolean;
  /** Тип нужен звуку гибели: у грифона он свой. */
  type: UnitType | BuildingType;
};

/** Видимое изменение сцены для эффекта и звука. */
export type SceneEvent =
  | { kind: 'move'; id: string; fromX: number; fromY: number }
  | {
      kind: 'damage';
      x: number;
      y: number;
      amount: number;
      building: boolean;
      /** Попадание по клетке подготовленного удара осады. */
      strike: boolean;
    }
  | { kind: 'heal'; x: number; y: number; amount: number }
  | {
      kind: 'death';
      x: number;
      y: number;
      hp: number;
      building: boolean;
      type: UnitType | BuildingType;
    }
  | {
      kind: 'spawn';
      id: string;
      x: number;
      y: number;
      owner: Owner;
      building: boolean;
    }
  | {
      kind: 'attack';
      id: string;
      /** Тип атакующего: звук зависит от оружия. */
      type: UnitType | BuildingType;
      /** Видимая цель для выпада; без неё только звук. */
      target?: { x: number; y: number };
    }
  | { kind: 'prepare'; x: number; y: number }
  | { kind: 'threat'; x: number; y: number };

type Entity = Unit | Building;

export type DiffContext = {
  /** Первый кадр партии: всё уже стоящее не «появляется». */
  firstRun: boolean;
  /** ID мира прошлого кадра: отличает найм от выхода из тумана. */
  knownIds: ReadonlySet<string>;
  /** ID мира сейчас: отличает гибель от ухода в туман. */
  worldIds: ReadonlySet<string>;
  isVisible: (x: number, y: number) => boolean;
  humanId: Owner | null;
  /** Видимые смотрящему отметки удара осады прошлого кадра, `"x,y"`. */
  strikeCells?: ReadonlySet<string>;
  /** Видимые отметки сейчас: исчезнувшая отметка — исполненный удар. */
  visibleStrikes?: ReadonlySet<string>;
  /**
   * Где объект погиб. Нужна, чтобы гибель после ухода в туман не
   * рисовалась на последней видимой клетке; без неё — прежняя клетка.
   */
  deathCell?: (id: string) => { x: number; y: number } | undefined;
};

/** Удар осады исполнен по клетке: отметка была видна и исчезла. */
const isStrikeHit = (
  key: string,
  before?: ReadonlySet<string>,
  now?: ReadonlySet<string>,
) => !!before?.has(key) && !now?.has(key);

const isBuilding = (entity: Entity): entity is Building =>
  !('maxMovePoints' in entity);

const attackPointsOf = (entity: Entity) =>
  'attackPoints' in entity ? entity.attackPoints : undefined;

/**
 * Сравнивает видимые объекты с прошлым кадром и описывает изменения.
 *
 * Работает только с тем, что видит смотрящий: объект, ушедший в туман или
 * вышедший из него, не даёт ни гибели, ни найма; трата очков атаки скрытым
 * врагом не видна, поэтому скрытый бой не выдаёт себя ни выпадом, ни звуком.
 *
 * @param previous - Состояние прошлого кадра по ID.
 * @param entities - Видимые объекты сейчас.
 * @param context - Видимость и составы мира.
 * @returns Новое состояние для следующего кадра и список изменений.
 */
export const diffScene = (
  previous: ReadonlyMap<string, Tracked>,
  entities: readonly Entity[],
  {
    firstRun,
    knownIds,
    worldIds,
    isVisible,
    humanId,
    strikeCells,
    visibleStrikes,
    deathCell,
  }: DiffContext,
) => {
  const tracked = new Map<string, Tracked>();
  const events: SceneEvent[] = [];
  const attackers: Entity[] = [];

  for (const entity of entities) {
    const { id, x, y, hp, owner } = entity;
    const attackPoints = attackPointsOf(entity);
    const building = isBuilding(entity);
    tracked.set(id, { x, y, hp, attackPoints, building, type: entity.type });
    const before = previous.get(id);

    if (!before) {
      if (firstRun) continue;
      // Найм — только для действительно нового объекта мира.
      if (!knownIds.has(id)) {
        events.push({ kind: 'spawn', id, x, y, owner, building });
      } else if (
        humanId &&
        !building &&
        entity.role === 'military' &&
        isHostile(humanId, owner)
      ) {
        events.push({ kind: 'threat', x, y });
      }
      continue;
    }

    if (before.x !== x || before.y !== y) {
      events.push({ kind: 'move', id, fromX: before.x, fromY: before.y });
    }
    if (hp < before.hp) {
      events.push({
        kind: 'damage',
        x,
        y,
        amount: before.hp - hp,
        building,
        strike: isStrikeHit(`${x},${y}`, strikeCells, visibleStrikes),
      });
    } else if (hp > before.hp) {
      events.push({ kind: 'heal', x, y, amount: hp - before.hp });
    }
    if (
      attackPoints !== undefined &&
      before.attackPoints !== undefined &&
      attackPoints < before.attackPoints
    ) {
      attackers.push(entity);
    }
  }

  for (const [id, before] of previous) {
    if (tracked.has(id)) continue;
    // Ушёл в туман — не гибель; гибель показываем только в обзоре и
    // по клетке, где объект погиб, а не где его видели последний раз.
    const cell = deathCell?.(id) ?? before;
    if (worldIds.has(id) || !isVisible(cell.x, cell.y)) continue;
    events.push({
      kind: 'death',
      x: cell.x,
      y: cell.y,
      hp: before.hp,
      building: before.building,
      type: before.type,
    });
  }

  const hits = events.filter(
    event => event.kind === 'damage' || event.kind === 'death',
  );
  for (const attacker of attackers) {
    if (attacker.type === 'siege') {
      // Скрытая наводка прячет отметку — тогда и подготовка не слышна.
      const aim = attacker.role === 'military' ? attacker.preparedStrike : null;
      if (aim && visibleStrikes?.has(`${aim.x},${aim.y}`)) {
        events.push({ kind: 'prepare', x: attacker.x, y: attacker.y });
      }
      continue;
    }
    // Лечение озвучивает само восстановление HP.
    if (attacker.type === 'healer') continue;
    const target = hits
      .map(hit => ({
        x: hit.x,
        y: hit.y,
        distance: Math.abs(hit.x - attacker.x) + Math.abs(hit.y - attacker.y),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    events.push({
      kind: 'attack',
      id: attacker.id,
      type: attacker.type,
      ...(target && { target: { x: target.x, y: target.y } }),
    });
  }

  return { tracked, events };
};
