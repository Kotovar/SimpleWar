import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { createUnit, useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { useKnowledgeStore } from '@entities/perceptions';
import { useJournalStore } from '@entities/journals';
import { useDebugStore, usePreferencesStore } from '@entities/settings';
import { useSandboxStore } from '@features/sandbox';
import {
  getAiPresentationSnapshot,
  waitForAiPresentation,
} from './aiPresentation';

beforeEach(() => {
  vi.useFakeTimers();
  usePreferencesStore.setState({ aiPlayback: 'normal' });
  useDebugStore.getState().resetStore();
  useSandboxStore.setState({ enabled: false, fast: false });
  useGameLoopStore.getState().resetGame();
  useJournalStore.getState().newGame();
  useBuildingsStore.setState({ buildings: {} });
  useUnitsStore.setState({
    units: {
      enemy: { ...createUnit('worker', 1, 0, 'p2', true)!, id: 'enemy' },
    },
  });
  useMapStore.setState({
    grid: [
      [
        { x: 0, y: 0, type: 'grass', isWalkable: true },
        { x: 1, y: 0, type: 'grass', isWalkable: true },
      ],
    ],
  });
  useKnowledgeStore.getState().setKnowledge({
    p1: {
      width: 2,
      height: 1,
      visible: new Uint8Array([1, 0]),
      terrain: new Uint8Array([1, 0]),
      contacts: {},
      strikes: {},
    },
  });
});
afterEach(() => {
  vi.useRealTimers();
  usePreferencesStore.setState({ aiPlayback: 'normal' });
  useDebugStore.getState().resetStore();
  useSandboxStore.setState({ enabled: false, fast: false });
  useGameLoopStore.getState().resetGame();
  useJournalStore.getState().newGame();
  useKnowledgeStore.getState().resetStore();
  useUnitsStore.setState({ units: {} });
  useBuildingsStore.setState({ buildings: {} });
  useMapStore.getState().resetStore();
});

describe('показ действий ИИ', () => {
  it('скрытый урон не меняет снимок; видимый урон меняет', () => {
    const hidden = getAiPresentationSnapshot();
    useUnitsStore.getState().damageUnit('enemy', 1);
    expect(getAiPresentationSnapshot()).toBe(hidden);
    const knowledge = useKnowledgeStore.getState().byParticipant.p1!;
    useKnowledgeStore.getState().setKnowledge({
      p1: {
        ...knowledge,
        visible: new Uint8Array([1, 1]),
      },
    });
    const visible = getAiPresentationSnapshot();
    useUnitsStore.getState().damageUnit('enemy', 1);
    expect(getAiPresentationSnapshot()).not.toBe(visible);
  });

  it('снимок учитывает выбранного наблюдателя и полный обзор отладки', () => {
    const hidden = getAiPresentationSnapshot();
    useDebugStore.getState().setEnabled(true);
    useDebugStore.getState().setViewer('p2');
    expect(getAiPresentationSnapshot()).not.toBe(hidden);
    useDebugStore.getState().setViewer('p1');
    expect(getAiPresentationSnapshot()).toBe(hidden);
    useDebugStore.getState().setFullView(true);
    expect(getAiPresentationSnapshot()).not.toBe(hidden);
  });

  it.each(['normal', 'fast'] as const)(
    'режим %s выдерживает свою визуальную паузу',
    async playback => {
      usePreferencesStore.getState().setAiPlayback(playback);
      const duration = playback === 'normal' ? 700 : 350;
      const finished = vi.fn();
      const waiting = waitForAiPresentation(() => false)!;
      void waiting.then(finished);
      await vi.advanceTimersByTimeAsync(duration - 1);
      expect(finished).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await waiting;
      expect(finished).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('пропуск и ускоренный тест не создают ожидания', () => {
    usePreferencesStore.getState().setAiPlayback('instant');
    expect(waitForAiPresentation(() => false)).toBeNull();
    usePreferencesStore.getState().setAiPlayback('normal');
    useSandboxStore.setState({ enabled: true, fast: true });
    expect(waitForAiPresentation(() => false)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('смена режима завершает текущую паузу и снимает таймер', async () => {
    const waiting = waitForAiPresentation(() => false)!;
    usePreferencesStore.getState().setAiPlayback('instant');
    await waiting;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('сброс партии завершает ожидание старого запуска', async () => {
    const gameId = useJournalStore.getState().gameId;
    const waiting = waitForAiPresentation(
      () => useJournalStore.getState().gameId !== gameId,
    )!;
    useJournalStore.getState().newGame();
    await waiting;
    expect(vi.getTimerCount()).toBe(0);
  });
});
