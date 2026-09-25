import { create } from 'zustand';
import type {
  CommandMeta,
  CommandRejection,
  CommandResult,
  JournalEventType,
  JournalVisibility,
  ParticipantId,
} from '@shared/config';
import { failure, withDevtools } from '@shared/lib';

/** Лимит хранимых записей каждого вида; старые вытесняются. */
export const JOURNAL_LIMIT = 200;

/**
 * Событие партии: выполненная команда или её последствие. `details` —
 * снимок сведений на момент события, а не ссылка на живые объекты.
 */
export type JournalEntry = {
  id: number;
  gameId: number;
  turn: number;
  type: JournalEventType;
  /** Кто действовал; `null` — служебное событие партии. */
  actor: ParticipantId | null;
  visibleTo: JournalVisibility;
  details?: Record<string, string | number>;
};

/** Новое событие для записи; служебные поля журнал заполняет сам. */
export type JournalEventInput = Omit<JournalEntry, 'id' | 'gameId'>;

/** Отказ или сбой команды; повтор подряд увеличивает `count`. */
export type JournalError = CommandMeta &
  CommandRejection & {
    id: number;
    gameId: number;
    turn: number;
    count: number;
    visibleTo: JournalVisibility;
  };

/** Свою команду видит только сам участник, служебную — все. */
const commandVisibility = ({ actor }: CommandMeta): JournalVisibility =>
  actor === null ? 'all' : [actor];

type JournalState = {
  /** Номер партии: записи разных партий не смешиваются. */
  gameId: number;
  nextId: number;
  entries: JournalEntry[];
  errors: JournalError[];

  record: (event: JournalEventInput) => void;
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
  withDevtools('journal', set => ({
    gameId: 1,
    nextId: 1,
    entries: [],
    errors: [],

    record: event =>
      set(state => {
        state.entries.push({
          ...event,
          id: state.nextId++,
          gameId: state.gameId,
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
          visibleTo: commandVisibility(meta),
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
  if (result.ok) {
    journal.record({ ...meta, turn, visibleTo: commandVisibility(meta) });
  } else journal.reportError(meta, turn, result);

  return result;
};

/**
 * Записи для обычного журнала участника: только те, что ему видны
 * (`visibleTo`), без технических деталей сбоя. Полные записи остаются
 * в отладочном журнале (всё хранилище).
 *
 * @param records - События или ошибки журнала.
 * @param viewer - Участник, которому показываем журнал.
 * @returns Видимые участнику записи без поля `detail`.
 */
export const getVisibleRecords = <
  T extends { visibleTo: JournalVisibility; detail?: string },
>(
  records: T[],
  viewer: ParticipantId,
): Omit<T, 'detail'>[] =>
  records
    .filter(
      ({ visibleTo }) => visibleTo === 'all' || visibleTo.includes(viewer),
    )
    .map(({ detail: _detail, ...record }) => record);
