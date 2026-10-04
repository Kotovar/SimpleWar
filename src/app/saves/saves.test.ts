import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useGameLoopStore } from '@entities/games';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { useResearchStore } from '@entities/researches';
import {
  useSettingsStore,
  useDebugStore,
  usePreferencesStore,
} from '@entities/settings';
import { createAiMemory, useAiMemoryStore } from '@entities/ai-memories';
import { useKnowledgeStore } from '@entities/perceptions';
import { useJournalStore } from '@entities/journals';
import { initBattleStats, useSandboxStore } from '@features/sandbox';
import { initVisibilitySystem } from '@features/visibility';
import {
  move,
  useHighlightStore,
  useMovementStore,
} from '@features/pathfinding';
import {
  nextTurn,
  resetGame,
  surrender,
  initGameLoopEvents,
} from '@features/game-loop';
import { prepareStrike } from '@features/combat';
import { useSelectionStore } from '@features/selection';
import { initializeGame, initializeSandbox } from '@widgets/start-game';
import { initGuidanceSystem, useGuidanceStore } from '@widgets/game-controls';
import { initJournalSystem, initPopulationSystem } from '@app/system';
import { runAITurn } from '@app/game/ai';
import { applySnapshot, captureSnapshot } from './snapshot';
import { parseRecord, parseSnapshot } from './validation';
import {
  AUTO_KEY,
  listSlots,
  manualKey,
  removeSlot,
  renameSlot,
  writeAuto,
  writeManual,
} from './storage';
import {
  autosaveDue,
  initSaveSystem,
  loadSnapshot,
  requestSnapshot,
  saveManual,
  setAutoSettings,
  useSaveStore,
} from './service';
import { diagnosticText, parseDiagnostic } from './diagnostic';
import { MAX_SAVE_BYTES, type GameSnapshot, type SaveRecord } from './types';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
  removeItem: (key: string) => {
    values.delete(key);
  },
};
let off: (() => void)[] = [];
const drain = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const record = (name = 'Первая'): SaveRecord => ({
  id: crypto.randomUUID(),
  name,
  savedAt: '2026-10-03T10:00:00.000Z',
  snapshot: captureSnapshot(),
});
const start = () => {
  useSettingsStore.setState({
    gridColumns: 15,
    gridRows: 15,
    mapGenerationMode: 'fixed',
    customSeed: 43,
  });
  expect(initializeGame()).toBe(true);
  useGameLoopStore.getState().startGame();
};
beforeEach(() => {
  vi.stubGlobal('localStorage', storage);
  values.clear();
  initPopulationSystem();
  initJournalSystem();
  initVisibilitySystem();
  initGameLoopEvents();
  initBattleStats();
  resetGame();
  useSandboxStore.setState({
    enabled: false,
    stats: {},
    paused: false,
    fast: false,
    skipped: [],
  });
  useSaveStore.setState({
    slots: [],
    auto: { enabled: true, interval: 1, keep: 3 },
    waiting: false,
    status: '',
    error: '',
    loadedGameId: null,
  });
  off.push(initGuidanceSystem());
  start();
});
afterEach(() => {
  off.forEach(fn => fn());
  off = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('формат и восстановление партии', () => {
  it('восстанавливает режим тестирования, настройки ИИ по умолчанию и боевой счёт', () => {
    resetGame();
    useSettingsStore.setState({ gridColumns: 15, gridRows: 15 });
    useSandboxStore.setState({ enabled: true });
    const started = initializeSandbox(useSandboxStore.getState().scenario)!;
    useGameLoopStore.getState().startGame(started.participants);
    const fighter = Object.values(useUnitsStore.getState().units).find(
      u => u.type === 'swordsman',
    )!;
    useUnitsStore.getState().damageUnit(fighter.id, 5);
    useSandboxStore.getState().setPaused(true);
    const saved = captureSnapshot();
    expect(
      saved.loop.participants.every(p => p.ai?.profile === 'balanced'),
    ).toBe(true);
    expect(saved.sandbox.stats.p1?.damage.swordsman).toBe(5);
    useUnitsStore.getState().healUnit(fighter.id, 5);
    applySnapshot(saved);
    expect(captureSnapshot().sandbox).toEqual(saved.sandbox);
    expect(useUnitsStore.getState().units[fighter.id].hp).toBe(
      saved.units[fighter.id].hp,
    );
  });
  it('восстанавливает завершённую партию с историческим населением выбывшего', () => {
    expect(surrender('p1').ok).toBe(true);
    const saved = captureSnapshot();
    expect(saved.loop.phase).toBe('gameOver');
    applySnapshot(saved);
    expect(useGameLoopStore.getState().winner).toBe('p2');
    expect(captureSnapshot().economy).toEqual(saved.economy);
  });
  it('сохраняет действия, лес, рельеф, исследования, рабочие связи, туман, планы и сводку без новых событий', () => {
    const unitId = useUnitsStore
      .getState()
      .spawnUnit('mage', 5, 5, 'p1', true)!;
    useUnitsStore.getState().damageUnit(unitId, 7);
    useUnitsStore.getState().setRestMode(unitId, 'sleep');
    useUnitsStore
      .getState()
      .setOrder(unitId, { type: 'goto', x: 7, y: 5, stopped: 'enemy' });
    const healer = useUnitsStore
      .getState()
      .spawnUnit('healer', 6, 5, 'p1', true)!;
    const griffon = useUnitsStore
      .getState()
      .spawnUnit('griffon', 7, 5, 'p1', true)!;
    useUnitsStore.getState().resetUnitsForNewTurn('p1');
    useUnitsStore.getState().changeAttackPoints(healer);
    useUnitsStore.getState().moveUnit(griffon, 7, 6, 1);
    const mine = useBuildingsStore
      .getState()
      .spawnBuilding('mine', 4, 5, 'p1')!;
    const worker = useUnitsStore
      .getState()
      .spawnUnit('worker', 4, 5, 'p1', true)!;
    useUnitsStore.getState().setWorkplace(worker, mine);
    const base = Object.values(useBuildingsStore.getState().buildings).find(
      b => b.owner === 'p1',
    )!;
    useBuildingsStore.getState().setRallyPoint(base.id, { x: 8, y: 8 });
    useResearchStore.setState({
      completed: { p1: ['cartography', 'artel'] },
      current: { p2: { type: 'engineering', turnsLeft: 2 } },
    });
    useMapStore.getState().setCell(3, 0, { type: 'grass', isWalkable: true });
    useMapStore.getState().setCell(8, 8, { type: 'hill', isWalkable: true });
    useMapStore.getState().setCell(8, 9, { type: 'swamp', isWalkable: true });
    const enemyWorker = Object.values(useUnitsStore.getState().units).find(
      u => u.owner === 'p2',
    )!;
    useAiMemoryStore.getState().setMemory('p2', {
      ...createAiMemory(345),
      tasks: [
        {
          id: 't1',
          kind: 'scout',
          ruleId: 'X01',
          unitId: enemyWorker.id,
          target: { x: 8, y: 7 },
          reserve: { gold: 0, wood: 0 },
          createdTurn: 1,
          reviewTurn: 4,
        },
      ],
      nextTaskId: 2,
    });
    useGuidanceStore.setState({
      summary: [
        {
          key: 'loss',
          text: 'Замечена атака',
          count: 1,
          position: { x: 4, y: 5 },
        },
      ],
      summaryTurn: 1,
    });
    useSelectionStore.getState().selectUnit(unitId);
    const snapshot = captureSnapshot();
    usePreferencesStore.setState({ aiPlayback: 'fast' });
    useSaveStore.setState({ auto: { enabled: false, interval: 5, keep: 1 } });
    const previousId = useJournalStore.getState().gameId;
    resetGame();
    applySnapshot(snapshot);
    const restored = captureSnapshot();
    expect({
      ...restored,
      journal: restored.journal.map(e => ({ ...e, gameId: 0 })),
    }).toEqual({
      ...snapshot,
      journal: snapshot.journal.map(e => ({ ...e, gameId: 0 })),
    });
    expect(useJournalStore.getState().gameId).toBeGreaterThan(previousId);
    expect(useJournalStore.getState().errors).toEqual([]);
    expect(useSelectionStore.getState().selection).toBeNull();
    expect(useMovementStore.getState().reachableCells).toBeNull();
    expect(useHighlightStore.getState().strikeCells).toBeNull();
    expect(usePreferencesStore.getState().aiPlayback).toBe('fast');
    expect(useSaveStore.getState().auto.enabled).toBe(false);
    expect(
      useKnowledgeStore.getState().byParticipant.p1!.visible,
    ).toBeInstanceOf(Uint8Array);
  });

  it.each([
    ['неизвестная версия', (s: GameSnapshot) => ({ ...s, version: 99 })],
    [
      'размер карты',
      (s: GameSnapshot) => ({ ...s, rules: { ...s.rules, gridRows: 101 } }),
    ],
    [
      'тип поля',
      (s: GameSnapshot) => ({ ...s, loop: { ...s.loop, currentTurn: '1' } }),
    ],
    [
      'порядок участников',
      (s: GameSnapshot) => ({
        ...s,
        loop: {
          ...s.loop,
          participants: [s.loop.participants[0], s.loop.participants[0]],
        },
      }),
    ],
    [
      'маска тумана',
      (s: GameSnapshot) => ({
        ...s,
        knowledge: {
          ...s.knowledge,
          p1: { ...s.knowledge.p1, terrain: [255] },
        },
      }),
    ],
    [
      'ссылка рабочего',
      (s: GameSnapshot) => ({
        ...s,
        units: Object.fromEntries(
          Object.entries(s.units).map(([id, u]) => [
            id,
            u.role === 'civil' ? { ...u, workplaceId: 'missing' } : u,
          ]),
        ),
      }),
    ],
    [
      'население',
      (s: GameSnapshot) => ({
        ...s,
        economy: {
          ...s.economy,
          populationCap: {
            ...s.economy.populationCap,
            p1: { max: 10, occupied: 100 },
          },
        },
      }),
    ],
  ])('отклоняет %s до изменения живой партии', (_, corrupt) => {
    const before = captureSnapshot();
    expect(() => parseSnapshot(JSON.stringify(corrupt(before)))).toThrow();
    expect(captureSnapshot()).toEqual(before);
  });

  it('не принимает JSON с опасными ключами и слишком большой файл', () => {
    const before = record();
    expect(() =>
      parseRecord(
        JSON.stringify(before).replace('"units":{', '"units":{"__proto__":{},'),
      ),
    ).toThrow();
    expect(() => parseSnapshot(' '.repeat(MAX_SAVE_BYTES + 1))).toThrow(
      /большой/,
    );
  });

  it('возобновляет одинаковые последующие решения ИИ с сохранённым сидом и планами', async () => {
    nextTurn('p1');
    const saved = captureSnapshot();
    await runAITurn('p2', { yieldControl: () => Promise.resolve() });
    const first = useJournalStore
      .getState()
      .decisions.map(({ id: _id, gameId: _gameId, ...decision }) => decision);
    const gold = useEconomyStore.getState().resources.p2.gold;
    applySnapshot(saved);
    await runAITurn('p2', { yieldControl: () => Promise.resolve() });
    const second = useJournalStore
      .getState()
      .decisions.map(({ id: _id, gameId: _gameId, ...decision }) => decision);
    expect(second).toEqual(first);
    expect(useEconomyStore.getState().resources.p2.gold).toBe(gold);
    expect(useGameLoopStore.getState().activePlayer).toBe('p1');
  });

  it('не повторяет уже сделанное движение и не восстанавливает очки при загрузке', () => {
    useMapStore.getState().setCell(3, 1, { type: 'grass', isWalkable: true });
    const worker = Object.values(useUnitsStore.getState().units).find(
      u => u.owner === 'p1',
    )!;
    expect(move({ actor: 'p1', unitId: worker.id, x: 3, y: 1 }).ok).toBe(true);
    useUnitsStore.getState().setOrder(worker.id, { type: 'goto', x: 5, y: 1 });
    const saved = captureSnapshot();
    applySnapshot(saved);
    expect(useUnitsStore.getState().units[worker.id]).toEqual(
      saved.units[worker.id],
    );
    expect(
      useJournalStore.getState().entries.filter(e => e.type === 'move'),
    ).toHaveLength(1);
  });
});

describe('слоты и атомарная запись', () => {
  it('подтверждённый автослот сохраняет идентичность после ротации', () => {
    writeAuto(record('Старый'), 3, storage);
    const selected = listSlots(storage).find(s => s.auto)!;
    writeAuto(record('Новый'), 3, storage);
    renameSlot(selected.key, 'Прежний', storage);
    expect(
      listSlots(storage)
        .filter(s => s.auto)
        .map(s => s.record?.name),
    ).toEqual(['Новый', 'Прежний']);
    removeSlot(selected.key, storage);
    expect(
      listSlots(storage)
        .filter(s => s.auto)
        .map(s => s.record?.name),
    ).toEqual(['Новый']);
  });
  it('не удаляет другую запись вместо повреждённой, если ротация изменилась за время подтверждения', () => {
    values.set(AUTO_KEY, JSON.stringify([{ broken: true }]));
    const selected = listSlots(storage).find(s => s.auto)!;
    writeAuto(record('Новый'), 3, storage);
    expect(() =>
      removeSlot(selected.key, storage, selected.damagedRaw),
    ).toThrow(/изменился/);
    expect(
      listSlots(storage).find(s => s.record?.name === 'Новый'),
    ).toBeDefined();
  });
  it('держит независимые именованные слоты, переименовывает и удаляет выбранный', () => {
    writeManual(manualKey(0), record('Первая'), storage);
    writeManual(manualKey(1), record('Вторая'), storage);
    renameSlot(manualKey(0), 'Новая', storage);
    expect(listSlots(storage)[0].record?.name).toBe('Новая');
    removeSlot(manualKey(0), storage);
    expect(listSlots(storage)[0].record).toBeUndefined();
    expect(listSlots(storage)[1].record?.name).toBe('Вторая');
  });
  it('показывает повреждённый слот рядом с рабочим', () => {
    values.set(manualKey(0), '{broken');
    writeManual(manualKey(1), record(), storage);
    expect(listSlots(storage)[0].error).toBeTruthy();
    expect(listSlots(storage)[1].record).toBeDefined();
  });
  it('при отказе перезаписи сохраняет старый ручной слот', () => {
    writeManual(manualKey(0), record(), storage);
    const previous = values.get(manualKey(0));
    const denied = {
      ...storage,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    };
    expect(() => writeManual(manualKey(0), record('Другая'), denied)).toThrow();
    expect(values.get(manualKey(0))).toBe(previous);
  });
  it('ротирует только автосейвы и сохраняет всю старую ротацию при отказе записи', () => {
    writeManual(manualKey(0), record('Ручной'), storage);
    for (const name of ['А', 'Б', 'В', 'Г'])
      writeAuto(record(name), 3, storage);
    expect(
      listSlots(storage)
        .filter(s => s.auto)
        .map(s => s.record?.name),
    ).toEqual(['Г', 'В', 'Б']);
    const previous = values.get(AUTO_KEY);
    const denied = {
      ...storage,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => writeAuto(record('Новый'), 1, denied)).toThrow();
    expect(values.get(AUTO_KEY)).toBe(previous);
    expect(listSlots(storage)[0].record?.name).toBe('Ручной');
    const autos = listSlots(storage).filter(s => s.auto);
    renameSlot(autos[0].key, 'Последний', storage);
    removeSlot(autos[1].key, storage);
    expect(
      listSlots(storage)
        .filter(s => s.auto)
        .map(s => s.record?.name),
    ).toEqual(['Последний', 'Б']);
  });
});

describe('безопасная граница и автосохранение', () => {
  it.each([1, 3, 5])('первый снимок и интервал %i своих ходов', interval => {
    expect(autosaveDue(7, 0, interval)).toBe(true);
    expect(autosaveDue(7 + interval - 1, 7, interval)).toBe(false);
    expect(autosaveDue(7 + interval, 7, interval)).toBe(true);
  });
  it('сохраняет первый ход, затем каждый третий после восстановления очков; загрузка не создаёт дубль', async () => {
    values.set(
      'simplewar:saves:settings',
      JSON.stringify({ enabled: true, interval: 3, keep: 3 }),
    );
    off.push(initSaveSystem());
    await drain();
    expect(listSlots(storage).filter(s => s.auto)).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      nextTurn('p1');
      nextTurn('p2');
      await drain();
    }
    const autos = listSlots(storage).filter(s => s.auto);
    expect(autos.map(s => s.record!.snapshot.loop.currentTurn)).toEqual([4, 1]);
    const worker = Object.values(autos[0].record!.snapshot.units).find(
      u => u.owner === 'p1',
    )!;
    expect(worker.movePoints).toBe(worker.maxMovePoints);
    const raw = values.get(AUTO_KEY);
    expect(loadSnapshot(autos[0].record!.snapshot)).toBe(true);
    await drain();
    expect(values.get(AUTO_KEY)).toBe(raw);
    setAutoSettings({ enabled: false, interval: 1, keep: 1 });
    nextTurn('p1');
    nextTurn('p2');
    await drain();
    expect(values.get(AUTO_KEY)).toBe(raw);
  });
  it('отменяет запрос после сброса или загрузки', async () => {
    off.push(initSaveSystem());
    await drain();
    const saved = captureSnapshot();
    const write = vi.fn();
    const request = requestSnapshot('save', write);
    resetGame();
    await request;
    expect(write).not.toHaveBeenCalled();
    expect(useSaveStore.getState().waiting).toBe(false);
    applySnapshot(saved);
    const second = requestSnapshot('save', write);
    loadSnapshot(saved);
    await second;
    expect(write).not.toHaveBeenCalled();
  });
  it('сообщает отказ хранилища через общий журнал и продолжает партию', async () => {
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    await saveManual(manualKey(0), 'Тест');
    expect(useJournalStore.getState().errors.at(-1)).toMatchObject({
      type: 'save',
      actor: 'p1',
    });
    expect(useSaveStore.getState().error).toMatch(/места/);
    expect(nextTurn('p1').ok).toBe(true);
  });
});

describe('диагностика', () => {
  it('отклоняет неверный тип настройки приложения в файле', () => {
    useDebugStore.getState().setEnabled(true);
    const before = captureSnapshot();
    const raw = JSON.stringify({
      kind: 'simplewar-diagnostic',
      version: 1,
      snapshot: before,
      application: {
        auto: useSaveStore.getState().auto,
        aiPlayback: ['normal'],
      },
    });
    expect(() => parseDiagnostic(raw)).toThrow(/настройки/);
    expect(captureSnapshot()).toEqual(before);
  });
  it('восстанавливает сцену в отладке и не меняет слоты или настройки приложения', () => {
    const snapshot = captureSnapshot();
    const raw = diagnosticText(snapshot);
    expect(() => parseDiagnostic(raw)).toThrow(/отладки/);
    useDebugStore.getState().setEnabled(true);
    expect(parseDiagnostic(raw)).toEqual(snapshot);
    writeManual(manualKey(0), record(), storage);
    const before = values.get(manualKey(0));
    expect(() =>
      parseDiagnostic(raw.replace('"version": 1', '"version": 99')),
    ).toThrow();
    expect(values.get(manualKey(0))).toBe(before);
  });
});

describe('осада и отмена работающего ИИ', () => {
  it('сбой старой асинхронной порции после загрузки не записывается в новую партию', async () => {
    nextTurn('p1');
    const saved = captureSnapshot();
    let rejectPortion = (_error: Error) => {};
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (clock += 100));
    const gate = new Promise<void>((_resolve, reject) => {
      rejectPortion = reject;
    });
    const old = runAITurn('p2', { yieldControl: () => gate });
    await drain();
    applySnapshot(saved);
    rejectPortion(new Error('Старый цикл прерван'));
    await old;
    expect(useJournalStore.getState().errors).toEqual([]);
  });
  const siegeScene = () => {
    const id = useUnitsStore.getState().spawnUnit('siege', 2, 2, 'p1', true)!;
    const target = useUnitsStore
      .getState()
      .spawnUnit('swordsman', 4, 2, 'p2', true)!;
    useResearchStore.setState({ completed: { p1: ['hiddenAiming'] } });
    useUnitsStore.getState().resetUnitsForNewTurn('p1');
    expect(prepareStrike({ actor: 'p1', unitId: id, x: 4, y: 2 }).ok).toBe(
      true,
    );
    return { id, target };
  };
  it('сохраняет подготовку, срок и скрытую отметку; после исполнения загрузка не повторяет урон', () => {
    const { id, target } = siegeScene();
    const saved = captureSnapshot();
    expect(saved.strikes[id]).toMatchObject({
      owner: 'p1',
      target: { x: 4, y: 2 },
      dueTurn: 2,
    });
    expect(saved.knowledge.p2!.strikes[id]).toBeUndefined();
    applySnapshot(saved);
    expect(
      useKnowledgeStore.getState().byParticipant.p2!.strikes[id],
    ).toBeUndefined();
    const hp = useUnitsStore.getState().units[target].hp;
    nextTurn('p1');
    nextTurn('p2');
    const after = captureSnapshot();
    expect(after.units[target].hp).toBeLessThan(hp);
    expect(after.strikes[id]).toBeUndefined();
    applySnapshot(after);
    expect(useUnitsStore.getState().units[target].hp).toBe(
      after.units[target].hp,
    );
    expect(
      useJournalStore.getState().entries.filter(e => e.type === 'strike'),
    ).toHaveLength(1);
    nextTurn('p1');
    nextTurn('p2');
    expect(useUnitsStore.getState().units[target].hp).toBe(
      after.units[target].hp,
    );
  });
  it('отклоняет удар без исполнителя или с неверным сроком', () => {
    const { id } = siegeScene();
    const saved = captureSnapshot();
    expect(() =>
      parseSnapshot(
        JSON.stringify({
          ...saved,
          strikes: { [id]: { ...saved.strikes[id], dueTurn: 100 } },
        }),
      ),
    ).toThrow(/срок/);
    expect(() =>
      parseSnapshot(
        JSON.stringify({ ...saved, strikes: { missing: saved.strikes[id] } }),
      ),
    ).toThrow();
  });
  it('round-trip после отмены подготовки не воскрешает удар', () => {
    const { id } = siegeScene();
    useUnitsStore.getState().setPreparedStrike(id, null);
    const saved = captureSnapshot();
    expect(saved.strikes).toEqual({});
    applySnapshot(saved);
    nextTurn('p1');
    nextTurn('p2');
    expect(
      useJournalStore.getState().entries.filter(e => e.type === 'strike'),
    ).toEqual([]);
  });
  it('ручная запись ждёт ИИ и получает его окончательную память', async () => {
    off.push(initSaveSystem());
    await drain();
    nextTurn('p1');
    let release = () => {};
    let first = true;
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (clock += 100));
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const ai = runAITurn('p2', {
      yieldControl: () => {
        if (first) {
          first = false;
          return gate;
        }
        return Promise.resolve();
      },
    });
    await drain();
    const saving = saveManual(manualKey(0), 'После ИИ');
    expect(useSaveStore.getState().waiting).toBe(true);
    expect(values.get(manualKey(0))).toBeUndefined();
    release();
    await ai;
    await saving;
    const saved = listSlots(storage)[0].record!.snapshot;
    expect(saved.loop.activePlayer).toBe('p1');
    expect(saved.ai).toEqual(useAiMemoryStore.getState().byParticipant);
  });
  it('загрузка отменяет старый цикл ИИ и выполняет ровно один новый', async () => {
    nextTurn('p1');
    const saved = captureSnapshot();
    let release = () => {};
    let clock = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (clock += 100));
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const old = runAITurn('p2', { yieldControl: () => gate });
    await drain();
    applySnapshot(saved);
    release();
    expect((await old)?.cancelled).toBe(true);
    expect(useGameLoopStore.getState().activePlayer).toBe('p2');
    const next = runAITurn('p2', { yieldControl: () => Promise.resolve() });
    expect(runAITurn('p2')).toBe(next);
    await next;
    expect(useGameLoopStore.getState().currentTurn).toBe(2);
    expect(
      useJournalStore
        .getState()
        .entries.filter(e => e.type === 'income' && e.actor === 'p2'),
    ).toHaveLength(1);
  });
});
