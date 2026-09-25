import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  CommandMeta,
  CommandRejection,
  CommandResult,
  ParticipantId,
} from '@shared/config';
import { failure } from '@shared/lib';

/** Лимит хранимых записей каждого вида; старые вытесняются. */
export const JOURNAL_LIMIT = 200;

/** Выполненное действие участника. */
export type JournalEntry = CommandMeta & {
  id: number;
  gameId: number;
  turn: number;
};

/** Отказ или сбой команды; повтор подряд увеличивает `count`. */
export type JournalError = CommandMeta &
  CommandRejection & {
    id: number;
    gameId: number;
    turn: number;
    count: number;
  };

type JournalState = {
  /** Номер партии: записи разных партий не смешиваются. */
  gameId: number;
  nextId: number;
  entries: JournalEntry[];
  errors: JournalError[];

  record: (meta: CommandMeta, turn: number) => void;
  reportError: (
    meta: CommandMeta,
    turn: number,
    rejection: CommandRejection,
  ) => void;
  clearErrors: () => void;
  newGame: () => void;
};

const isSameError = (
  error: JournalError,
  meta: CommandMeta,
  rejection: CommandRejection,
) =>
  error.type === meta.type &&
  error.actor === meta.actor &&
  error.code === rejection.code &&
  error.message === rejection.message &&
  JSON.stringify(error.details) === JSON.stringify(meta.details);

export const useJournalStore = create<JournalState>()(
  immer(set => ({
    gameId: 1,
    nextId: 1,
    entries: [],
    errors: [],

    record: (meta, turn) =>
      set(state => {
        state.entries.push({
          ...meta,
          id: state.nextId++,
          gameId: state.gameId,
          turn,
        });
        if (state.entries.length > JOURNAL_LIMIT) state.entries.shift();
      }),

    reportError: (meta, turn, rejection) =>
      set(state => {
        const last = state.errors.at(-1);
        if (last && isSameError(last, meta, rejection)) {
          last.count++;
          last.turn = turn;
          return;
        }

        state.errors.push({
          ...meta,
          ...rejection,
          id: state.nextId++,
          gameId: state.gameId,
          turn,
          count: 1,
        });
        if (state.errors.length > JOURNAL_LIMIT) state.errors.shift();
      }),

    clearErrors: () =>
      set(state => {
        state.errors = [];
      }),

    newGame: () =>
      set(state => {
        state.gameId++;
        state.entries = [];
        state.errors = [];
      }),
  })),
);

/**
 * Выполняет команду и записывает итог в общий журнал: успех — в события,
 * отказ или исключение — в ошибки. Исключение превращается в сбой.
 *
 * @param meta - Тип команды, участник и параметры для записи.
 * @param turn - Текущий номер хода.
 * @param execute - Проверка и применение команды.
 * @returns Итог команды.
 */
export const runCommand = (
  meta: CommandMeta,
  turn: number,
  execute: () => CommandResult,
): CommandResult => {
  let result: CommandResult;
  try {
    result = execute();
  } catch (error) {
    result = failure(error instanceof Error ? error.message : String(error));
  }

  const journal = useJournalStore.getState();
  if (result.ok) journal.record(meta, turn);
  else journal.reportError(meta, turn, result);

  return result;
};

/**
 * Записи, которые можно показать участнику в обычном журнале: только его
 * собственные действия и служебные события партии, без технических деталей
 * сбоя. Полные записи остаются в отладочном журнале (всё хранилище).
 *
 * @param records - События или ошибки журнала.
 * @param viewer - Участник, которому показываем журнал.
 * @returns Записи без чужих действий и поля `detail`.
 */
export const getVisibleRecords = <T extends CommandMeta & { detail?: string }>(
  records: T[],
  viewer: ParticipantId,
): Omit<T, 'detail'>[] =>
  records
    .filter(({ actor }) => actor === null || actor === viewer)
    .map(({ detail: _detail, ...record }) => record);
