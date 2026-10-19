import { create } from 'zustand';
import type { CommandType } from '@shared/config';
import { isRestoringGame } from '@shared/lib';
import { getHumanId, useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { waitForCurrentAi } from '@app/game/ai';
import { applySnapshot, captureSnapshot } from './snapshot';
import {
  listSlots,
  readAutoSettings,
  writeAuto,
  writeAutoSettings,
  writeManual,
} from './storage';
import {
  DEFAULT_AUTO,
  type AutoSettings,
  type GameSnapshot,
  type SaveRecord,
  type Slot,
} from './types';

type SaveState = {
  loadedGameId: number | null;
  slots: Slot[];
  auto: AutoSettings;
  status: string;
  error: string;
  waiting: boolean;
};
export const useSaveStore = create<SaveState>(() => ({
  loadedGameId: null,
  slots: [],
  auto: { ...DEFAULT_AUTO },
  status: '',
  error: '',
  waiting: false,
}));
export const reportSaveError = (type: CommandType, error: unknown) => {
  const message =
    error instanceof DOMException
      ? 'Браузер не разрешает запись или недостаточно места. Прежние сохранения сохранены.'
      : error instanceof Error
        ? error.message
        : 'Не удалось выполнить операцию с сохранением';
  useSaveStore.setState({ error: message, status: '', waiting: false });
  const loop = useGameLoopStore.getState();
  useJournalStore
    .getState()
    .reportError(
      { type, actor: getHumanId(loop.participants) },
      loop.currentTurn,
      {
        ok: false,
        kind: 'failure',
        code: 'failure',
        message,
        detail: String(error),
      },
    );
};
export const refreshSlots = () => {
  try {
    const slots = listSlots();
    useSaveStore.setState({ slots });
    const loop = useGameLoopStore.getState();
    for (const slot of slots) {
      if (!slot.error) continue;
      useJournalStore
        .getState()
        .reportError(
          { type: 'load', actor: getHumanId(loop.participants) },
          loop.currentTurn,
          {
            ok: false,
            kind: 'failure',
            code: 'failure',
            message: slot.error,
            detail: slot.key,
          },
        );
    }
  } catch {
    reportSaveError(
      'load',
      new Error('Браузер не разрешает доступ к сохранениям'),
    );
  }
};
export const setAutoSettings = (auto: AutoSettings) => {
  try {
    writeAutoSettings(auto);
    useSaveStore.setState({ auto, error: '', status: 'Настройки сохранены' });
  } catch {
    reportSaveError(
      'save',
      new Error('Браузер не разрешает сохранить настройки'),
    );
  }
};
const record = (snapshot: GameSnapshot, name: string): SaveRecord => ({
  id: crypto.randomUUID(),
  name: name.trim() || `Ход ${snapshot.loop.currentTurn}`,
  savedAt: new Date().toISOString(),
  snapshot,
});
let requestId = 0;
let autoEpoch = { gameId: 0, lastSeen: '', anchor: 0 };

/** Даже запрос из подписчика команды выполняется только после завершения текущего стека. */
export const requestSnapshot = async (
  type: 'save' | 'export',
  write: (snapshot: GameSnapshot) => void,
) => {
  if (useSaveStore.getState().waiting) return;
  const token = ++requestId;
  const gameId = useJournalStore.getState().gameId;
  useSaveStore.setState({
    waiting: true,
    error: '',
    status: 'Ожидание завершения действий…',
  });
  try {
    await waitForCurrentAi();
    if (gameId !== useJournalStore.getState().gameId || token !== requestId)
      return;
    write(captureSnapshot());
    useSaveStore.setState({
      waiting: false,
      error: '',
      status: type === 'save' ? 'Партия сохранена' : 'Файл диагностики скачан',
    });
    refreshSlots();
  } catch (error) {
    if (gameId === useJournalStore.getState().gameId && token === requestId)
      reportSaveError(
        type,
        error instanceof DOMException
          ? new Error(
              'Браузер не разрешает запись или недостаточно места. Прежние сохранения сохранены.',
            )
          : error,
      );
  }
};
export const saveManual = (key: string, name: string) =>
  requestSnapshot('save', snapshot => writeManual(key, record(snapshot, name)));

export const loadSnapshot = (snapshot: GameSnapshot) => {
  try {
    applySnapshot(snapshot);
    autoEpoch = {
      gameId: useJournalStore.getState().gameId,
      lastSeen: humanStamp(),
      anchor: snapshot.loop.currentTurn,
    };
    useSaveStore.setState({
      loadedGameId: useJournalStore.getState().gameId,
      error: '',
      status: 'Партия загружена',
      waiting: false,
    });
    return true;
  } catch (error) {
    reportSaveError('load', error);
    return false;
  }
};
const humanStamp = () => {
  const loop = useGameLoopStore.getState();
  if (
    loop.phase !== 'inProgress' ||
    getHumanId(loop.participants) !== loop.activePlayer
  )
    return '';
  return `${loop.currentTurn}:${loop.activePlayer}`;
};
export const autosaveDue = (turn: number, anchor: number, interval: number) =>
  anchor === 0 || turn - anchor >= interval;

/** Микрозадача видит уже восстановленные очки, удары, видимость и новую память ИИ. */
export const initSaveSystem = () => {
  try {
    useSaveStore.setState({ auto: readAutoSettings() });
  } catch {
    reportSaveError(
      'save',
      new Error('Не удалось прочитать настройки автосохранения'),
    );
  }
  refreshSlots();
  let disposed = false;
  let scheduled = false;
  const flush = async () => {
    scheduled = false;
    const gameId = useJournalStore.getState().gameId;
    await waitForCurrentAi();
    if (disposed || gameId !== useJournalStore.getState().gameId) return;
    const stamp = humanStamp();
    if (!stamp) return;
    if (autoEpoch.gameId !== gameId)
      autoEpoch = { gameId, lastSeen: '', anchor: 0 };
    if (stamp === autoEpoch.lastSeen) return;
    autoEpoch.lastSeen = stamp;
    const { auto } = useSaveStore.getState();
    const turn = useGameLoopStore.getState().currentTurn;
    if (!auto.enabled || !autosaveDue(turn, autoEpoch.anchor, auto.interval))
      return;
    try {
      writeAuto(
        record(captureSnapshot(), `Автосохранение · ход ${turn}`),
        auto.keep,
      );
      autoEpoch.anchor = turn;
      refreshSlots();
    } catch (error) {
      reportSaveError(
        'save',
        error instanceof DOMException
          ? new Error(
              'Автосохранение не записано: нет доступа или места. Предыдущие снимки сохранены.',
            )
          : error,
      );
    }
  };
  const schedule = () => {
    if (isRestoringGame() || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      void flush();
    });
  };
  const offLoop = useGameLoopStore.subscribe(schedule);
  const offJournal = useJournalStore.subscribe((next, before) => {
    if (next.gameId !== before.gameId) {
      requestId++;
      useSaveStore.setState({ waiting: false, status: '', error: '' });
      schedule();
    }
  });
  schedule();
  return () => {
    disposed = true;
    offLoop();
    offJournal();
  };
};
