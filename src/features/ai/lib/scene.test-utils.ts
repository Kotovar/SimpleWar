import type {
  Building,
  BuildingType,
  CellType,
  Position,
  Resources,
  Unit,
  UnitType,
} from '@shared/config';
import { createUnit } from '@entities/units';
import { createBuilding } from '@entities/buildings';
import { createAiMemory, type AiMemory } from '@entities/ai-memories';
import type { Observation, RememberedContact } from '@entities/perceptions';
import { buildContext, type AiContext } from './context';
import { createTurnState } from './memory';
import type { AiAction } from '../model/types';

const TERRAIN: Record<string, CellType> = {
  '.': 'grass',
  h: 'hill',
  '~': 'swamp',
  '^': 'mountain',
  w: 'water',
  f: 'forest',
  g: 'gold',
};

let counter = 0;

/** Открытое поле из травы. */
export const grass = (width: number, height: number) =>
  Array.from({ length: height }, () => '.'.repeat(width));

/** Свой юнит ИИ (`p2`) с восстановленными очками движения, стройки и атаки. */
export const own = (
  type: UnitType,
  x: number,
  y: number,
  patch: Partial<Unit> = {},
): Unit => {
  const unit = createUnit(type, x, y, 'p2', true)!;
  const ready =
    unit.role === 'military' ? { attackPoints: unit.maxAttackPoints } : {};
  return { ...unit, ...ready, id: `${type}-${++counter}`, ...patch } as Unit;
};

/** Своё здание ИИ (`p2`). */
export const ownBuilding = (
  type: BuildingType,
  x: number,
  y: number,
  patch: Partial<Building> = {},
): Building => {
  const building = createBuilding(type, x, y, 'p2')!;
  const ready =
    building.role === 'production'
      ? { spawnPoints: building.maxSpawnPoints }
      : building.role === 'combat'
        ? { attackPoints: building.maxAttackPoints }
        : {};
  return {
    ...building,
    ...ready,
    id: `${type}-${++counter}`,
    ...patch,
  } as Building;
};

/** Видимый враг (`p1`) с наблюдаемыми полями. */
export const foe = (
  type: UnitType | BuildingType,
  x: number,
  y: number,
  patch: { hp?: number; id?: string } = {},
): Observation['visibleEnemies'][number] => {
  const kind =
    type in { worker: 1, swordsman: 1, archer: 1 } ? 'unit' : 'building';
  const maxHp =
    kind === 'unit'
      ? createUnit(type as UnitType, 0, 0, 'p1', false)!.maxHp
      : createBuilding(type as BuildingType, 0, 0, 'p1')!.maxHp;
  return {
    id: patch.id ?? `${type}-foe-${++counter}`,
    kind,
    type,
    owner: 'p1',
    x,
    y,
    hp: patch.hp ?? maxHp,
    maxHp,
  };
};

/** Контакт из памяти: враг вне обзора с оценкой достоверности. */
export const remembered = (
  type: UnitType,
  x: number,
  y: number,
  confidence: RememberedContact['confidence'] = 'recent',
): RememberedContact => ({ ...foe(type, x, y), seenTurn: 4, confidence });

type SceneSpec = {
  /** Строки карты; `?` — неразведанная клетка. */
  map: string[];
  units?: Unit[];
  buildings?: Building[];
  enemies?: Observation['visibleEnemies'];
  contacts?: RememberedContact[];
  stock?: Resources;
  population?: Observation['population'];
  turn?: number;
  memory?: Partial<AiMemory>;
  /** Клетки вне обзора: `x,y`. */
  hidden?: string[];
};

/**
 * Маленькая известная сцена для правил ИИ: наблюдение строится так же,
 * как у настоящей стороны, без хранилищ мира.
 */
export const scene = (
  spec: SceneSpec,
): { ctx: AiContext; obs: Observation; memory: AiMemory } => {
  const height = spec.map.length;
  const width = spec.map[0].length;
  const knownTerrain = spec.map.map(row =>
    row.split('').map(char => (char === '?' ? null : TERRAIN[char])),
  );
  const hidden = new Set(spec.hidden ?? []);
  const visible = knownTerrain.map((row, y) =>
    row.map((type, x) => type !== null && !hidden.has(`${x},${y}`)),
  );
  const resources = knownTerrain.flatMap((row, y) =>
    row.flatMap((type, x) =>
      type === 'gold' || type === 'forest' ? [{ x, y, type }] : [],
    ),
  );
  const turn = spec.turn ?? 5;
  const obs: Observation = {
    participant: 'p2',
    turn,
    width,
    height,
    ownUnits: spec.units ?? [],
    ownBuildings: spec.buildings ?? [],
    stock: spec.stock ?? { gold: 500, wood: 500 },
    population: spec.population ?? { max: 20, occupied: 2 },
    visibleEnemies: spec.enemies ?? [],
    knownTerrain,
    visible,
    resources,
    contacts: spec.contacts ?? [],
  };
  const memory = { ...createAiMemory(7), ...spec.memory };
  return { ctx: buildContext(obs, memory, createTurnState()), obs, memory };
};

/** Действия правила кратко: для сравнения в тестах. */
export const kinds = (candidates: { action: { type: string } }[]) =>
  candidates.map(({ action }) => action.type);

/** Клетка действия: куда идти, строить или расчищать. */
export const cellOf = (action: AiAction): Position => {
  if (!('x' in action)) throw new Error(`у действия ${action.type} нет клетки`);
  return { x: action.x, y: action.y };
};
