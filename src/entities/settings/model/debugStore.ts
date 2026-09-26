import { create } from 'zustand';
import { withDevtools } from '@shared/lib';
import type { DebugException, ParticipantId, Resources } from '@shared/config';

type DebugState = {
  /** Режим отладки включён: только тогда исключения действуют. */
  enabled: boolean;
  /** Включённые исключения каждого участника; по умолчанию пусто. */
  exceptions: Partial<Record<ParticipantId, DebugException[]>>;
  /** В этой партии режим включали: признак не снимается выключением. */
  usedInGame: boolean;

  setEnabled: (enabled: boolean) => void;
  setException: (
    participants: ParticipantId[],
    exception: DebugException,
    on: boolean,
  ) => void;
  resetStore: () => void;
};

export const useDebugStore = create<DebugState>()(
  withDevtools('debug', set => ({
    enabled: false,
    exceptions: {},
    usedInGame: false,

    setEnabled: enabled =>
      set(state => {
        state.enabled = enabled;
        if (enabled) state.usedInGame = true;
      }),

    setException: (participants, exception, on) =>
      set(state => {
        for (const id of participants) {
          const current = state.exceptions[id] ?? [];
          const next = current.filter(item => item !== exception);
          state.exceptions[id] = on ? [...next, exception] : next;
        }
      }),

    resetStore: () =>
      set(state => {
        state.enabled = false;
        state.exceptions = {};
        state.usedInGame = false;
      }),
  })),
);

/**
 * Исключения отладки, действующие для участника прямо сейчас.
 *
 * @param actor - Участник, выполняющий команду.
 * @returns Список включённых исключений; пустой, если режим выключен.
 */
export const getDebugExceptions = (actor: ParticipantId): DebugException[] => {
  const { enabled, exceptions } = useDebugStore.getState();
  return enabled ? (exceptions[actor] ?? []) : [];
};

/** Ресурсы, которых хватает на любую цену: так бесплатность проходит проверку цены. */
const UNLIMITED: Resources = { gold: Infinity, wood: Infinity };

/**
 * Ресурсы для проверки цены с учётом бесплатности. Один расчёт для
 * предпросмотра в интерфейсе и для исполнения команды.
 *
 * @param resources - Реальные ресурсы участника.
 * @param isFree - Действует ли исключение бесплатности.
 * @returns Реальные ресурсы либо неограниченные при бесплатности.
 */
export const getPayableResources = (resources: Resources, isFree: boolean) =>
  isFree ? UNLIMITED : resources;

/**
 * Подписка интерфейса на одно исключение участника: предпросмотр цены
 * совпадает с тем, что применит команда.
 *
 * @param actor - Участник, для которого показываем цену.
 * @param exception - Проверяемое исключение.
 * @returns `true`, если режим включён и исключение действует.
 */
export const useDebugException = (
  actor: ParticipantId,
  exception: DebugException,
) =>
  useDebugStore(
    state => state.enabled && !!state.exceptions[actor]?.includes(exception),
  );
