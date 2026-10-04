import {
  AI_DIFFICULTY,
  AI_PROFILES,
  BUILDINGS_CONFIG,
  CELL_SIZE_LIMITS,
  DEBUG_EXCEPTIONS,
  MAP_SIDE_LIMIT,
  MAX_POPULATION_LIMIT,
  MOVE_COST,
  PARTICIPANT_IDS,
  REJECTION_MESSAGE,
  RESEARCH_CONFIG,
  STRATEGY_NAME,
  UNITS_CONFIG,
} from '@shared/config';
import { TERRAIN_CODES } from '@entities/perceptions';
import { HINTS, TUTORIAL } from '@widgets/game-controls';
import {
  MAX_SAVE_BYTES,
  SAVE_VERSION,
  type GameSnapshot,
  type SaveRecord,
} from './types';

type Check = (value: unknown) => boolean;
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const num =
  (min = 0, max = 1_000_000_000): Check =>
  v =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const int =
  (min = 0, max = 1_000_000_000): Check =>
  v =>
    num(min, max)(v) && Number.isInteger(v);
const text =
  (max = 200): Check =>
  v =>
    typeof v === 'string' && v.length > 0 && v.length <= max;
const bool: Check = v => typeof v === 'boolean';
const one =
  (values: readonly unknown[]): Check =>
  v =>
    values.includes(v);
const nullable =
  (check: Check): Check =>
  v =>
    v === null || check(v);
const list =
  (check: Check, max = 10_000): Check =>
  v =>
    Array.isArray(v) && v.length <= max && v.every(check);
const dictionary =
  (check: Check, key: Check = text(), max = 10_000): Check =>
  v =>
    obj(v) &&
    Object.keys(v).length <= max &&
    Object.entries(v).every(
      ([k, value]) =>
        !['__proto__', 'constructor', 'prototype'].includes(k) &&
        key(k) &&
        check(value),
    );
const shape =
  (
    required: Record<string, Check>,
    optional: Record<string, Check> = {},
  ): Check =>
  v =>
    obj(v) &&
    Object.entries(required).every(
      ([k, check]) => Object.hasOwn(v, k) && check(v[k]),
    ) &&
    Object.entries(v).every(
      ([k, value]) =>
        Object.hasOwn(required, k) ||
        (Object.hasOwn(optional, k) && optional[k](value)),
    );
const requireValid = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message);
};
const participant = one(PARTICIPANT_IDS);
const participants = (check: Check) => dictionary(check, participant, 4);
const unitType = one(Object.keys(UNITS_CONFIG));
const buildingType = one(Object.keys(BUILDINGS_CONFIG));
const researchType = one(Object.keys(RESEARCH_CONFIG));
const position = shape({
  x: int(0, MAP_SIDE_LIMIT - 1),
  y: int(0, MAP_SIDE_LIMIT - 1),
});
const resources = shape({ gold: int(), wood: int() });
const setup = shape({
  profile: one(Object.keys(AI_PROFILES)),
  difficulty: one(Object.keys(AI_DIFFICULTY)),
});
const controller = one(['human', 'ai', 'passive']);
const order: Check = v => {
  if (!obj(v)) return false;
  const extra: Record<string, Check> =
    v.type === 'build'
      ? { buildingType }
      : v.type === 'work'
        ? { buildingId: text() }
        : {};
  return shape(
    {
      type: one(['goto', 'explore', 'build', 'work']),
      x: int(0, MAP_SIDE_LIMIT - 1),
      y: int(0, MAP_SIDE_LIMIT - 1),
      ...extra,
    },
    {
      stopped: one([
        ...Object.keys(REJECTION_MESSAGE),
        'enemy',
        'explored',
        'threat',
      ]),
    },
  )(v);
};
const base = {
  id: text(),
  x: int(0, MAP_SIDE_LIMIT - 1),
  y: int(0, MAP_SIDE_LIMIT - 1),
  owner: participant,
  hp: int(1, 100_000),
  maxHp: int(1, 100_000),
  sightRange: int(0, 100),
  cost: resources,
};
const unit: Check = v => {
  if (!obj(v) || !unitType(v.type)) return false;
  const civil = v.type === 'worker';
  const role: Record<string, Check> = civil
    ? {
        role: one(['civil']),
        canBuild: bool,
        buildableBuildings: list(buildingType, 11),
        buildPoints: int(0, 100),
        maxBuildPoints: int(0, 100),
        workplaceId: nullable(text()),
      }
    : {
        role: one(['military']),
        attack: int(0, 100_000),
        attackPoints: int(0, 100),
        maxAttackPoints: int(0, 100),
        attackRange: int(0, 100),
        preparedStrike: nullable(position),
      };
  return shape(
    {
      ...base,
      type: unitType,
      ...role,
      movePoints: int(0, 100),
      maxMovePoints: int(0, 100),
      requiresLimit: int(0, 30),
    },
    { restMode: one(['skip', 'sleep']), order },
  )(v);
};
const building: Check = v => {
  if (!obj(v) || !buildingType(v.type)) return false;
  const income = shape({}, { gold: int(), wood: int() });
  const common = { ...base, type: buildingType };
  const optional = { requiredField: one(TERRAIN_CODES), income };
  switch (v.type) {
    case 'base':
    case 'barracks':
    case 'stable':
    case 'workshop':
    case 'sanctuary':
      return shape(
        {
          ...common,
          role: one(['production']),
          spawningUnits: list(unitType, 10),
          spawnPoints: int(0, 100),
          maxSpawnPoints: int(0, 100),
        },
        { ...optional, rallyPoint: position },
      )(v);
    case 'mine':
    case 'sawmill':
      return shape({ ...common, role: one(['resource']), income }, optional)(v);
    case 'farm':
      return shape(
        { ...common, role: one(['supply']), populationSupply: int(0, 100) },
        optional,
      )(v);
    case 'tower':
      return shape(
        {
          ...common,
          role: one(['combat']),
          attack: int(0, 100_000),
          attackPoints: int(0, 100),
          maxAttackPoints: int(0, 100),
          attackRange: int(0, 100),
        },
        optional,
      )(v);
    case 'forge':
      return shape({ ...common, role: one(['research']) }, optional)(v);
    case 'palisade':
      return shape({ ...common, role: one(['obstacle']) }, optional)(v);
    default:
      return false;
  }
};
const memory = shape({
  seed: int(0, 0xffff_ffff),
  strategy: one(Object.keys(STRATEGY_NAME)),
  strategyScore: num(-1e9, 1e9),
  strategySince: int(),
  nextTaskId: int(1),
  tasks: list(
    shape(
      {
        id: text(),
        kind: one(['build', 'scout']),
        ruleId: text(),
        unitId: text(),
        target: position,
        reserve: resources,
        createdTurn: int(),
        reviewTurn: int(),
      },
      { buildingType },
    ),
    1000,
  ),
  operation: shape({
    phase: one(['gather', 'advance', 'engage', 'retreat']),
    target: nullable(position),
    rally: nullable(position),
    since: int(),
  }),
  garrison: list(text(), 1000),
  lastWorkplace: dictionary(
    shape({
      buildingId: text(),
      type: buildingType,
      x: int(0, MAP_SIDE_LIMIT - 1),
      y: int(0, MAP_SIDE_LIMIT - 1),
    }),
  ),
  blindStrikes: dictionary(position),
  siegeLosses: dictionary(
    int(),
    v => typeof v === 'string' && /^\d+,\d+$/.test(v),
  ),
});
const summary = shape(
  { key: text(1000), text: text(1000), count: int(1) },
  { position },
);
const side = shape(
  {
    controller,
    units: dictionary(int(0, 20), unitType, 10),
    buildings: dictionary(int(0, 5), buildingType, 11),
    stock: resources,
  },
  { profile: one(Object.keys(AI_PROFILES)) },
);
const eventTypes = [
  'start',
  'move',
  'rest',
  'order',
  'attack',
  'build',
  'spawn',
  'endTurn',
  'surrender',
  'assign',
  'unassign',
  'repair',
  'clearForest',
  'demolish',
  'prepareStrike',
  'heal',
  'startResearch',
  'cancelResearch',
  'unitDestroyed',
  'buildingDestroyed',
  'eliminated',
  'gameOver',
  'strike',
  'researchDone',
  'attackObserved',
  'income',
  'enemySpotted',
  'save',
  'load',
  'import',
  'export',
];
const snapshotShape = shape({
  version: one([SAVE_VERSION]),
  gameVersion: text(),
  generatorVersion: int(1),
  race: one(['basic']),
  loop: shape({
    currentTurn: int(1),
    participants: list(
      shape({ id: participant, controller }, { ai: setup }),
      4,
    ),
    eliminated: list(participant, 4),
    activePlayer: participant,
    phase: one(['inProgress', 'gameOver']),
    winner: nullable(participant),
  }),
  rules: shape({
    gridColumns: int(1, 100),
    gridRows: int(1, 100),
    mapGenerationMode: one(['random', 'fixed']),
    customSeed: int(0, Number.MAX_SAFE_INTEGER),
    aiSetup: setup,
  }),
  view: shape({
    cellSize: int(CELL_SIZE_LIMITS.min, CELL_SIZE_LIMITS.max),
    camera: shape({ x: num(-1000, 1000), y: num(-1000, 1000) }),
  }),
  map: shape({
    seed: nullable(int(0, Number.MAX_SAFE_INTEGER)),
    usedFallback: bool,
    grid: list(
      list(
        shape({
          x: int(0, MAP_SIDE_LIMIT - 1),
          y: int(0, MAP_SIDE_LIMIT - 1),
          type: one(TERRAIN_CODES),
          isWalkable: bool,
        }),
        100,
      ),
      100,
    ),
  }),
  debug: shape({
    enabled: bool,
    usedInGame: bool,
    fullView: bool,
    viewer: nullable(participant),
    exceptions: participants(list(one(DEBUG_EXCEPTIONS.map(e => e.id)), 3)),
  }),
  units: dictionary(unit),
  buildings: dictionary(building),
  economy: shape({
    resources: shape(
      Object.fromEntries(PARTICIPANT_IDS.map(id => [id, resources])),
    ),
    populationCap: shape(
      Object.fromEntries(
        PARTICIPANT_IDS.map(id => [
          id,
          shape({
            max: int(0, MAX_POPULATION_LIMIT),
            occupied: int(0, 300_000),
          }),
        ]),
      ),
    ),
  }),
  research: shape({
    completed: participants(list(researchType, 5)),
    current: participants(shape({ type: researchType, turnsLeft: int(1, 3) })),
  }),
  knowledge: participants(
    shape({
      width: int(1, 100),
      height: int(1, 100),
      visible: list(one([0, 1])),
      terrain: list(int(0, TERRAIN_CODES.length)),
      contacts: dictionary(
        shape(
          {
            id: text(),
            kind: one(['unit', 'building']),
            type: one([
              ...Object.keys(UNITS_CONFIG),
              ...Object.keys(BUILDINGS_CONFIG),
            ]),
            owner: participant,
            x: int(0, MAP_SIDE_LIMIT - 1),
            y: int(0, MAP_SIDE_LIMIT - 1),
            hp: int(1, 100_000),
            maxHp: int(1, 100_000),
            seenTurn: int(),
          },
          { byScout: bool },
        ),
      ),
      strikes: dictionary(position),
    }),
  ),
  ai: participants(memory),
  strikes: dictionary(
    shape({ owner: participant, target: position, dueTurn: int(1) }),
  ),
  journal: list(
    shape(
      {
        id: int(1),
        gameId: int(1),
        turn: int(),
        type: one(eventTypes),
        actor: nullable(participant),
        visibleTo: v => v === 'all' || list(participant, 4)(v),
      },
      {
        details: dictionary(
          v => text(2000)(v) || num(-1e9, 1e9)(v),
          text(),
          30,
        ),
      },
    ),
    200,
  ),
  guidance: shape({
    seen: list(one(Object.keys(HINTS)), 5),
    hints: list(one(Object.keys(HINTS)), 5),
    tutorialActive: bool,
    completed: list(one(TUTORIAL.map(s => s.id)), 8),
    pending: list(summary, 1000),
    summary: list(summary, 1000),
    summaryTurn: int(),
  }),
  sandbox: shape({
    enabled: bool,
    paused: bool,
    fast: bool,
    scenario: shape({
      emptyField: bool,
      sides: v => list(side, 2)(v) && Array.isArray(v) && v.length === 2,
    }),
    stats: participants(
      shape({
        losses: dictionary(
          int(),
          one([...Object.keys(UNITS_CONFIG), ...Object.keys(BUILDINGS_CONFIG)]),
          21,
        ),
        damage: dictionary(
          int(),
          one([...Object.keys(UNITS_CONFIG), ...Object.keys(BUILDINGS_CONFIG)]),
          21,
        ),
      }),
    ),
    skipped: list(text(), 1000),
  }),
});

function validateSnapshot(value: unknown): asserts value is GameSnapshot {
  requireValid(
    obj(value) && value.version === SAVE_VERSION,
    'Неизвестная версия сохранения',
  );
  requireValid(
    snapshotShape(value),
    'Сохранение повреждено: неверные поля, типы или диапазоны',
  );
  // После полной проверки структуры проверяем ссылки и совместные ограничения.
  const s = value as GameSnapshot;
  const { gridColumns: width, gridRows: height } = s.rules;
  const ids = s.loop.participants.map(p => p.id);
  const idSet = new Set(ids);
  const eliminated = new Set(s.loop.eliminated);
  const alive = ids.filter(id => !eliminated.has(id));
  const aliveSet = new Set(alive);
  const inside = (p: { x: number; y: number }) => p.x < width && p.y < height;
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    a.x === b.x && a.y === b.y;
  requireValid(
    ids.length >= 2 &&
      new Set(ids).size === ids.length &&
      new Set(s.loop.eliminated).size === s.loop.eliminated.length &&
      s.loop.eliminated.every(id => idSet.has(id)) &&
      idSet.has(s.loop.activePlayer),
    'Повреждён порядок участников',
  );
  requireValid(
    s.loop.phase !== 'inProgress' ||
      (alive.length >= 2 &&
        aliveSet.has(s.loop.activePlayer) &&
        s.loop.winner === null),
    'Повреждена очередь ходов',
  );
  requireValid(
    s.loop.winner === null ||
      (alive.length === 1 &&
        alive[0] === s.loop.winner &&
        s.loop.phase === 'gameOver'),
    'Повреждён исход партии',
  );
  requireValid(
    s.loop.participants.every(p => p.controller !== 'ai' || !!p.ai),
    'Не заданы настройки ИИ',
  );
  requireValid(
    !s.debug.enabled || s.debug.usedInGame,
    'Повреждена отметка отладки',
  );
  requireValid(
    s.map.grid.length === height &&
      s.map.grid.every(
        (row, y) =>
          row.length === width &&
          row.every(
            (cell, x) =>
              cell.x === x &&
              cell.y === y &&
              cell.isWalkable === (MOVE_COST[cell.type] !== undefined),
          ),
      ),
    'Повреждена карта',
  );
  const unitCells = new Set<string>();
  const buildingCells = new Set<string>();
  const workers = new Set<string>();
  for (const [id, u] of Object.entries(s.units)) {
    requireValid(
      id === u.id &&
        !s.buildings[id] &&
        aliveSet.has(u.owner) &&
        inside(u) &&
        u.hp <= u.maxHp &&
        u.movePoints <= u.maxMovePoints,
      'Повреждён юнит',
    );
    const cell = `${u.x},${u.y}`;
    requireValid(!unitCells.has(cell), 'Два юнита в одной клетке');
    unitCells.add(cell);
    if (u.order) {
      requireValid(inside(u.order), 'Цель приказа вне карты');
      if (u.order.type === 'work' && s.buildings[u.order.buildingId])
        requireValid(
          s.buildings[u.order.buildingId].owner === u.owner &&
            s.buildings[u.order.buildingId].role === 'resource',
          'Неверная цель рабочего',
        );
    }
    if (u.role === 'civil') {
      requireValid(
        u.buildPoints <= u.maxBuildPoints,
        'Повреждены рабочие действия',
      );
      if (u.workplaceId) {
        const b = s.buildings[u.workplaceId];
        requireValid(
          !!b &&
            b.role === 'resource' &&
            b.owner === u.owner &&
            same(u, b) &&
            !workers.has(b.id),
          'Повреждена связь рабочего и здания',
        );
        workers.add(u.workplaceId);
      }
    } else {
      requireValid(
        u.attackPoints <= u.maxAttackPoints,
        'Повреждены боевые действия',
      );
      if (u.preparedStrike) {
        const strike = s.strikes[id];
        const due =
          s.loop.currentTurn +
          (ids.indexOf(u.owner) <= ids.indexOf(s.loop.activePlayer) ? 1 : 0);
        requireValid(
          u.type === 'siege' &&
            inside(u.preparedStrike) &&
            !!strike &&
            strike.owner === u.owner &&
            same(strike.target, u.preparedStrike) &&
            strike.dueTurn === due,
          'Повреждён подготовленный удар или срок исполнения',
        );
      } else requireValid(!s.strikes[id], 'Удар без подготовки');
    }
  }
  requireValid(
    Object.keys(s.strikes).every(
      id => s.units[id]?.role === 'military' && !!s.units[id].preparedStrike,
    ),
    'Удар без исполнителя',
  );
  for (const [id, b] of Object.entries(s.buildings)) {
    const cell = `${b.x},${b.y}`;
    requireValid(
      id === b.id &&
        aliveSet.has(b.owner) &&
        inside(b) &&
        b.hp <= b.maxHp &&
        !buildingCells.has(cell),
      'Повреждено здание',
    );
    buildingCells.add(cell);
    if (b.role === 'production')
      requireValid(
        b.spawnPoints <= b.maxSpawnPoints &&
          (!b.rallyPoint || inside(b.rallyPoint)),
        'Повреждён найм или точка сбора',
      );
    if (b.role === 'combat')
      requireValid(
        b.attackPoints <= b.maxAttackPoints,
        'Повреждены действия башни',
      );
  }
  for (const id of PARTICIPANT_IDS) {
    const occupied = Object.values(s.units)
      .filter(u => u.owner === id)
      .reduce((sum, u) => sum + u.requiresLimit, 0);
    requireValid(
      !aliveSet.has(id) || occupied === s.economy.populationCap[id].occupied,
      'Повреждён учёт населения',
    );
    const completed = s.research.completed[id] ?? [];
    const completedSet = new Set(completed);
    requireValid(
      completedSet.size === completed.length &&
        (!s.research.current[id] ||
          !completedSet.has(s.research.current[id]!.type)),
      'Повреждены исследования',
    );
    const k = s.knowledge[id];
    requireValid(!k || idSet.has(id), 'Знания чужого участника');
    if (aliveSet.has(id)) requireValid(!!k, 'Отсутствуют знания участника');
    if (k) {
      requireValid(
        k.width === width &&
          k.height === height &&
          k.visible.length === width * height &&
          k.terrain.length === width * height &&
          k.visible.every((v, i) => !v || !!k.terrain[i]),
        'Повреждены маски тумана',
      );
      for (const [key, c] of Object.entries(k.contacts))
        requireValid(
          key === c.id &&
            idSet.has(c.owner) &&
            c.owner !== id &&
            inside(c) &&
            c.hp <= c.maxHp &&
            c.seenTurn <= s.loop.currentTurn &&
            (c.kind === 'unit' ? unitType(c.type) : buildingType(c.type)),
          'Повреждена память контактов',
        );
      for (const [key, mark] of Object.entries(k.strikes))
        requireValid(
          inside(mark) &&
            (eliminated.has(id) ||
              (!!s.strikes[key] && same(mark, s.strikes[key].target))),
          'Повреждена память удара',
        );
    }
    const memory = s.ai[id];
    if (memory) {
      requireValid(idSet.has(id), 'Память чужого ИИ');
      requireValid(
        memory.tasks.every(
          t =>
            inside(t.target) &&
            t.createdTurn <= s.loop.currentTurn &&
            t.reviewTurn >= t.createdTurn &&
            (!s.units[t.unitId] || s.units[t.unitId].owner === id),
        ) &&
          new Set(memory.tasks.map(t => t.unitId)).size ===
            memory.tasks.length &&
          new Set(memory.tasks.map(t => t.id)).size === memory.tasks.length,
        'Повреждены задачи ИИ',
      );
      requireValid(
        [
          memory.operation.target,
          memory.operation.rally,
          ...Object.values(memory.lastWorkplace),
          ...Object.values(memory.blindStrikes),
        ].every(p => !p || inside(p)),
        'Цель ИИ вне карты',
      );
    }
  }
  requireValid(
    s.journal.every(
      (entry, i) =>
        entry.turn <= s.loop.currentTurn &&
        (!entry.actor || idSet.has(entry.actor)) &&
        (!i || entry.id > s.journal[i - 1].id),
    ),
    'Повреждён журнал',
  );
  requireValid(
    [...s.guidance.pending, ...s.guidance.summary].every(
      row => !row.position || inside(row.position),
    ),
    'Сводка вне карты',
  );
}

const readJson = (raw: string): unknown => {
  requireValid(
    new Blob([raw]).size <= MAX_SAVE_BYTES,
    'Файл сохранения слишком большой (предел 8 МБ)',
  );
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Сохранение повреждено: не удалось прочитать JSON');
  }
};
export const parseSnapshot = (raw: string): GameSnapshot => {
  const value = readJson(raw);
  validateSnapshot(value);
  return value;
};
export const parseRecord = (raw: string): SaveRecord => {
  const value = readJson(raw);
  requireValid(
    shape({
      id: text(),
      name: text(60),
      savedAt: v => typeof v === 'string' && Number.isFinite(Date.parse(v)),
      snapshot: () => true,
    })(value),
    'Повреждено описание слота',
  );
  const record = value as SaveRecord;
  validateSnapshot(record.snapshot);
  return record;
};
