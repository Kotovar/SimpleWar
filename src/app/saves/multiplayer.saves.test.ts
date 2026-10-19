import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { ParticipantId } from '@shared/config';
import { useGameLoopStore } from '@entities/games';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useSettingsStore } from '@entities/settings';
import { useAiMemoryStore } from '@entities/ai-memories';
import { useSandboxStore } from '@features/sandbox';
import { initVisibilitySystem } from '@features/visibility';
import {
  initGameLoopEvents,
  nextTurn,
  resetGame,
  surrender,
} from '@features/game-loop';
import { initializeStandardGame } from '@widgets/start-game';
import { initJournalSystem, initPopulationSystem } from '@app/system';
import { runAITurn } from '@app/game/ai';
import { applySnapshot, captureSnapshot } from './snapshot';
import { listSlots, manualKey } from './storage';
import { initSaveSystem, saveManual, useSaveStore } from './service';

/** M6: сохранения партии на четверых — выбывание, ход ИИ, автозапись. */

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
const play = (id: ParticipantId) =>
  runAITurn(id, { yieldControl: () => Promise.resolve() });
/** Снимок без номера партии в журнале: загрузка начинает новую партию. */
const withoutGame = (snapshot: object) =>
  JSON.parse(
    JSON.stringify(snapshot, (key, value) =>
      key === 'gameId' ? undefined : value,
    ),
  );
const owned = (owner: ParticipantId) =>
  [
    ...Object.values(useUnitsStore.getState().units),
    ...Object.values(useBuildingsStore.getState().buildings),
  ].filter(entity => entity.owner === owner).length;

beforeEach(() => {
  vi.stubGlobal('localStorage', storage);
  values.clear();
  initPopulationSystem();
  initJournalSystem();
  initVisibilitySystem();
  initGameLoopEvents();
  resetGame();
  useSandboxStore.setState({ enabled: false, paused: false, fast: false });
  useSaveStore.setState({
    slots: [],
    auto: { enabled: true, interval: 1, keep: 3 },
    waiting: false,
    status: '',
    error: '',
    loadedGameId: null,
  });
  useSettingsStore.setState({
    gridColumns: 30,
    gridRows: 30,
    mapGenerationMode: 'fixed',
    customSeed: 43,
    aiSetups: [
      { profile: 'balanced', difficulty: 'normal' },
      { profile: 'aggressive', difficulty: 'normal' },
      { profile: 'defensive', difficulty: 'hard' },
    ],
  });
  const participants = initializeStandardGame();
  expect(participants).toHaveLength(4);
  useGameLoopStore.getState().startGame(participants!);
});
afterEach(() => {
  off.forEach(fn => fn());
  off = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('сохранения на четверых (M6)', () => {
  it('после выбывания ИИ снимок восстанавливает очередь, память и мир', async () => {
    expect(nextTurn('p1').ok).toBe(true);
    await play('p2');
    expect(surrender('p3').ok).toBe(true);
    const saved = captureSnapshot();
    expect(saved.loop).toMatchObject({
      activePlayer: 'p4',
      eliminated: ['p3'],
      phase: 'inProgress',
    });

    await play('p4');
    applySnapshot(saved);
    expect(withoutGame(captureSnapshot())).toEqual(withoutGame(saved));
    expect(owned('p3')).toBe(0);
    expect(Object.keys(useAiMemoryStore.getState().byParticipant)).toEqual(
      Object.keys(saved.ai),
    );

    // Очередь после загрузки пропускает выбывшего: p4 → p1 → p2 → p4.
    await play('p4');
    expect(useGameLoopStore.getState()).toMatchObject({
      activePlayer: 'p1',
      currentTurn: 2,
    });
    expect(nextTurn('p1').ok).toBe(true);
    await play('p2');
    expect(useGameLoopStore.getState().activePlayer).toBe('p4');
  });

  it('запись посреди хода ИИ ждёт его и продолжает очередь с следующего ИИ', async () => {
    off.push(initSaveSystem());
    await drain();
    expect(nextTurn('p1').ok).toBe(true);
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
    const saving = saveManual(manualKey(0), 'Посреди очереди');
    expect(values.get(manualKey(0))).toBeUndefined();
    release();
    await ai;
    await saving;
    const saved = listSlots(storage)[0].record!.snapshot;
    expect(saved.loop.activePlayer).toBe('p3');
    expect(saved.ai.p2).toEqual(useAiMemoryStore.getState().byParticipant.p2);

    applySnapshot(saved);
    await play('p3');
    await play('p4');
    expect(useGameLoopStore.getState()).toMatchObject({
      activePlayer: 'p1',
      currentTurn: 2,
    });
  });

  it('автозапись — по своим ходам человека в круге из четырёх и после выбывания', async () => {
    values.set(
      'simplewar:saves:settings',
      JSON.stringify({ enabled: true, interval: 3, keep: 3 }),
    );
    off.push(initSaveSystem());
    await drain();
    const round = async (sides: ParticipantId[]) => {
      for (const id of sides) expect(nextTurn(id).ok).toBe(true);
      await drain();
    };
    for (let i = 0; i < 3; i++) await round(['p1', 'p2', 'p3', 'p4']);
    expect(surrender('p2').ok).toBe(true);
    for (let i = 0; i < 3; i++) await round(['p1', 'p3', 'p4']);

    const autos = listSlots(storage).filter(slot => slot.auto);
    expect(autos.map(slot => slot.record!.snapshot.loop.currentTurn)).toEqual([
      7, 4, 1,
    ]);
    expect(autos[0].record!.snapshot.loop.eliminated).toEqual(['p2']);
  });
});
