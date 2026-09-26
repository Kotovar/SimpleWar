import {
  AI_CONFIG,
  MOVE_COST,
  type Building,
  type CellType,
  type CivilUnit,
  type Cost,
  type MilitaryUnit,
  type Position,
  type Unit,
} from '@shared/config';
import { calculateTurnIncome, type MovementGrid } from '@shared/lib';
import type { AiMemory } from '@entities/ai-memories';
import type { Observation, RememberedContact } from '@entities/perceptions';
import type { TurnState } from '../model/types';
import { cellKey, manhattan, sides } from './geometry';
import { statsOf } from './stats';

/** Видимый враг или контакт с публичными боевыми свойствами. */
export type EnemyView = Omit<RememberedContact, 'seenTurn' | 'confidence'> & {
  attack: number;
  range: number;
  move: number;
  armed: boolean;
  /** Вес знания: 1 — виден сейчас, меньше — по памяти. */
  certainty: number;
};

/**
 * Факты для правил, выведенные только из наблюдения стороны и её памяти.
 * Скрытый мир сюда не попадает: исполнитель проверит законность отдельно.
 */
export type AiContext = {
  obs: Observation;
  memory: AiMemory;
  turn: TurnState;
  config: typeof AI_CONFIG;
  width: number;
  height: number;
  base: Building | null;
  workers: CivilUnit[];
  military: MilitaryUnit[];
  /** Видимые враги. */
  enemies: EnemyView[];
  /** Враги по памяти вне обзора. */
  remembered: EnemyView[];
  /** Запасы за вычетом резервов задач. */
  budget: Cost;
  /** Прогноз дохода на конец хода. */
  income: Cost;
  known: (x: number, y: number) => CellType | null;
  inside: (p: Position) => boolean;
  /** Клетка занята своим объектом, видимым врагом или известным зданием. */
  occupied: (x: number, y: number) => boolean;
  /** Цены входа по известной карте; неизвестное — `unknownCost`. */
  grid: (unknownCost: number) => MovementGrid;
  /** Сумма урона, который враги могут нанести по клетке в их ход. */
  threatAt: (p: Position) => number;
  /** Граница разведки: известные проходимые клетки у неизвестных. */
  frontier: Position[];
  /** Кэш расчётов шага: пути юнитов считаются один раз. */
  cache: Map<string, unknown>;
};

const toView = (
  contact: Omit<RememberedContact, 'seenTurn' | 'confidence'>,
  certainty: number,
): EnemyView => ({ ...contact, ...statsOf(contact.type), certainty });

/**
 * Собирает контекст шага ИИ из наблюдения.
 *
 * @param obs - Наблюдение стороны.
 * @param memory - Память ИИ этой стороны.
 * @param turn - Состояние текущего хода.
 * @param config - Настройки ИИ.
 */
export const buildContext = (
  obs: Observation,
  memory: AiMemory,
  turn: TurnState,
  config = AI_CONFIG,
): AiContext => {
  const { width, height } = obs;
  const known = (x: number, y: number) => obs.knownTerrain[y]?.[x] ?? null;
  const inside = ({ x, y }: Position) =>
    x >= 0 && y >= 0 && x < width && y < height;

  const enemies = obs.visibleEnemies.map(enemy => toView(enemy, 1));
  const remembered = obs.contacts.map(contact =>
    toView(contact, config.contactWeight[contact.confidence]),
  );

  const blocked = new Set<number>();
  const block = ({ x, y }: Position) => blocked.add(cellKey(x, y, width));
  obs.ownUnits.forEach(block);
  obs.ownBuildings.forEach(block);
  enemies.forEach(block);
  remembered.filter(({ kind }) => kind === 'building').forEach(block);
  const occupied = (x: number, y: number) => blocked.has(cellKey(x, y, width));

  const grids = new Map<number, MovementGrid>();
  const grid = (unknownCost: number) => {
    const cached = grids.get(unknownCost);
    if (cached) return cached;
    const next = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        if (occupied(x, y)) return 0;
        const type = known(x, y);
        return type ? (MOVE_COST[type] ?? 0) : unknownCost;
      }),
    );
    grids.set(unknownCost, next);
    return next;
  };

  const threats = [...enemies, ...remembered].filter(({ armed }) => armed);
  const threatAt = (p: Position) =>
    threats.reduce(
      (sum, enemy) =>
        manhattan(enemy, p) <= enemy.move + enemy.range
          ? sum + enemy.attack * enemy.certainty
          : sum,
      0,
    );

  const frontier: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const type = known(x, y);
      if (!type || MOVE_COST[type] === undefined) continue;
      const unknownSide = sides({ x, y }).some(
        side => inside(side) && !known(side.x, side.y),
      );
      if (unknownSide) frontier.push({ x, y });
    }
  }

  const reserved = memory.tasks.reduce(
    (sum, task) => ({
      gold: sum.gold + task.reserve.gold,
      wood: sum.wood + task.reserve.wood,
    }),
    { gold: 0, wood: 0 },
  );

  return {
    obs,
    memory,
    turn,
    config,
    width,
    height,
    base: obs.ownBuildings.find(({ type }) => type === 'base') ?? null,
    workers: obs.ownUnits.filter(
      (unit): unit is CivilUnit => unit.role === 'civil',
    ),
    military: obs.ownUnits.filter(
      (unit): unit is MilitaryUnit => unit.role === 'military',
    ),
    enemies,
    remembered,
    budget: {
      gold: obs.stock.gold - reserved.gold,
      wood: obs.stock.wood - reserved.wood,
    },
    income: calculateTurnIncome(obs.ownBuildings, obs.ownUnits as Unit[])
      .income,
    known,
    inside,
    occupied,
    grid,
    threatAt,
    frontier,
    cache: new Map(),
  };
};
