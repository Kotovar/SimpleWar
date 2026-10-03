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
  blindStrikes: {},
  siegeLosses: {},
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
        // Удар в конце хода мог добавить потерю, пока планировщик держал снимок.
        const losses = { ...memory.siegeLosses };
        for (const [cell, until] of Object.entries(
          state.byParticipant[participant]?.siegeLosses ?? {},
        ))
          losses[cell] = Math.max(losses[cell] ?? 0, until);
        state.byParticipant[participant] = { ...memory, siegeLosses: losses };
      }),

    resetStore: () =>
      set(state => {
        state.byParticipant = {};
      }),
  })),
);

gameEvents.subscribe(event => {
  if (event.type === 'GAME_RESET') useAiMemoryStore.getState().resetStore();
  if (event.type === 'SIEGE_STRIKE_EXECUTED') {
    const store = useAiMemoryStore.getState();
    const memory = store.byParticipant[event.owner] ?? createAiMemory(0);
    store.setMemory(event.owner, {
      ...memory,
      blindStrikes: {
        ...memory.blindStrikes,
        [`${event.x},${event.y}`]: { x: event.x, y: event.y },
      },
    });
  }
  if (event.type === 'SIEGE_BUILDING_DESTROYED') {
    const store = useAiMemoryStore.getState();
    const memory = store.byParticipant[event.owner] ?? createAiMemory(0);
    store.setMemory(event.owner, {
      ...memory,
      siegeLosses: {
        ...memory.siegeLosses,
        [`${event.x},${event.y}`]: event.turn + 2,
      },
    });
  }
});
