import { create } from 'zustand';
import { hasFormationNeighbor, withDevtools } from '@shared/lib';
import {
  FORMATION_ARMOR,
  type Building,
  type ParticipantId,
  type ResearchType,
  type Unit,
} from '@shared/config';

/** Текущая работа кузницы стороны: что изучается и сколько своих ходов осталось. */
export type ResearchWork = { type: ResearchType; turnsLeft: number };

type ResearchState = {
  /** Завершённые исследования стороны; эффекты не исчезают. */
  completed: Partial<Record<ParticipantId, ResearchType[]>>;
  /** Одна работа на сторону; нет записи — работы нет. */
  current: Partial<Record<ParticipantId, ResearchWork>>;

  /** Запускает работу; проверки и списание цены — в команде. */
  start: (owner: ParticipantId, type: ResearchType, turns: number) => void;
  cancel: (owner: ParticipantId) => void;
  /**
   * Продвигает работу стороны на один ход.
   *
   * @returns Тип исследования, если оно завершилось на этом ходу.
   */
  advance: (owner: ParticipantId) => ResearchType | null;
  resetStore: () => void;
};

export const useResearchStore = create<ResearchState>()(
  withDevtools('research', (set, get) => ({
    completed: {},
    current: {},

    start: (owner, type, turns) =>
      set(state => {
        state.current[owner] = { type, turnsLeft: turns };
      }),

    cancel: owner =>
      set(state => {
        delete state.current[owner];
      }),

    advance: owner => {
      const work = get().current[owner];
      if (!work) return null;
      const done = work.turnsLeft <= 1;
      set(state => {
        if (!done) {
          state.current[owner]!.turnsLeft--;
          return;
        }
        delete state.current[owner];
        (state.completed[owner] ??= []).push(work.type);
      });
      return done ? work.type : null;
    },

    resetStore: () =>
      set(state => {
        state.completed = {};
        state.current = {};
      }),
  })),
);

/**
 * Изучено ли исследование стороной. Правило проверяется в месте применения,
 * базовая конфигурация не меняется.
 *
 * @param owner - Сторона.
 * @param type - Исследование.
 */
export const hasResearch = (owner: ParticipantId, type: ResearchType) =>
  useResearchStore.getState().completed[owner]?.includes(type) ?? false;

/**
 * Прибавка к физической защите цели от исследований её стороны: Строй даёт
 * копейщику с соседом-копейщиком по стороне `FORMATION_ARMOR`, не суммируясь.
 * Здания и прочие юниты прибавки не получают.
 *
 * @param target - Цель удара.
 * @param units - Все юниты мира.
 */
export const getResearchArmor = (
  target: Unit | Building,
  units: Iterable<Unit>,
) =>
  target.type === 'spearman' &&
  hasResearch(target.owner, 'formation') &&
  hasFormationNeighbor(target, units)
    ? FORMATION_ARMOR
    : 0;
