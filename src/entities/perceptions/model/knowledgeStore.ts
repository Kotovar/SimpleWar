import { create } from 'zustand';
import type { ParticipantId } from '@shared/config';
import type { ParticipantKnowledge } from './types';

type KnowledgeState = {
  /** Знания каждого участника; другие участники и ИИ их не читают. */
  byParticipant: Partial<Record<ParticipantId, ParticipantKnowledge>>;

  /** Заменяет знания участников; неизменившиеся остаются теми же объектами. */
  setKnowledge: (
    next: Partial<Record<ParticipantId, ParticipantKnowledge>>,
  ) => void;
  resetStore: () => void;
};

// Без DevTools: маски клеток большие, и расширение сериализовало бы их
// на каждом шаге движения. Состояние меняется только целиком, без Immer.
export const useKnowledgeStore = create<KnowledgeState>()(set => ({
  byParticipant: {},

  setKnowledge: next => set({ byParticipant: next }),

  resetStore: () => set({ byParticipant: {} }),
}));

/**
 * Знания участника: подписка интерфейса только на его часть.
 *
 * @param participant - Участник; `null` — знаний нет.
 */
export const useParticipantKnowledge = (participant: ParticipantId | null) =>
  useKnowledgeStore(state =>
    participant ? state.byParticipant[participant] : undefined,
  );

/**
 * Текущие знания участника вне React.
 *
 * @param participant - Участник.
 */
export const getParticipantKnowledge = (participant: ParticipantId) =>
  useKnowledgeStore.getState().byParticipant[participant];
