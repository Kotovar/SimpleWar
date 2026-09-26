import { create } from 'zustand';
import type { ParticipantId } from '@shared/config';
import { gameEvents, withDevtools } from '@shared/lib';
import type { AiMemory } from './types';

/**
 * Пустая память ИИ на старте партии.
 *
 * @param seed - Сид разрешения равных оценок.
 */
export const createAiMemory = (seed: number): AiMemory => ({
  seed,
  strategy: 'G02',
  strategyScore: 0,
  strategySince: 0,
  tasks: [],
  nextTaskId: 1,
  operation: { phase: 'gather', target: null, rally: null, since: 0 },
  garrison: [],
  lastWorkplace: {},
});

type AiMemoryState = {
  /** Память каждого ИИ отдельно: планы и резервы не смешиваются. */
  byParticipant: Partial<Record<ParticipantId, AiMemory>>;
  setMemory: (participant: ParticipantId, memory: AiMemory) => void;
  resetStore: () => void;
};

export const useAiMemoryStore = create<AiMemoryState>()(
  withDevtools('aiMemory', set => ({
    byParticipant: {},

    setMemory: (participant, memory) =>
      set(state => {
        state.byParticipant[participant] = memory;
      }),

    resetStore: () =>
      set(state => {
        state.byParticipant = {};
      }),
  })),
);

gameEvents.subscribe(event => {
  if (event.type === 'GAME_RESET') useAiMemoryStore.getState().resetStore();
});
