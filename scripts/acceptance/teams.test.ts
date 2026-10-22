import { writeFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vite-plus/test';
import {
  DEFAULT_AI_SETUP,
  PARTICIPANT_IDS,
  type Participant,
} from '@shared/config';
import { gameEvents, isHostile } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useJournalStore } from '@entities/journals';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { initGameLoopEvents, resetGame } from '@features/game-loop';
import { initVisibilitySystem } from '@features/visibility';
import { initPopulationSystem } from '@app/system';
import { runAITurn } from '@app/game/ai';
import { captureSnapshot } from '@app/saves/snapshot';

afterEach(() => {
  vi.restoreAllMocks();
  resetGame();
});

it.each([3, 4])(
  'P02: подготовленный бой %s сторон до командного исхода',
  async count => {
    initPopulationSystem();
    initGameLoopEvents();
    initVisibilitySystem();
    resetGame();
    let serial = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () =>
        `00000000-0000-4000-8000-${(++serial).toString(16).padStart(12, '0')}`,
    );
    const participants: Participant[] = PARTICIPANT_IDS.slice(0, count).map(
      (id, i) => ({
        id,
        controller: 'ai',
        ai: DEFAULT_AI_SETUP,
        team: i < 2 ? 1 : 2,
      }),
    );
    useSettingsStore.setState({ gridColumns: 30, gridRows: 30 });
    useMapStore.getState().setGrid(
      Array.from({ length: 30 }, (_, y) =>
        Array.from({ length: 30 }, (_, x) => ({
          x,
          y,
          type: 'grass',
          isWalkable: true,
        })),
      ),
      43,
    );
    useGameLoopStore.getState().startGame(participants);
    for (const [i, p] of participants.entries()) {
      const x = i < 2 ? 1 : 13;
      const y = i % 2 ? 12 : 1;
      const base = useBuildingsStore
        .getState()
        .spawnBuilding('base', x, y, p.id)!;
      useBuildingsStore.getState().damageBuilding(base, 100);
      useEconomyStore.setState(state => ({
        resources: { ...state.resources, [p.id]: { gold: 0, wood: 0 } },
      }));
      if (i < 2) {
        for (const [ux, uy] of [
          [10, y],
          [10, y + 1],
          [9, y + 2],
          [10, y + 3],
        ])
          useUnitsStore.getState().spawnUnit('swordsman', ux, uy, p.id, true);
      }
    }
    const income: Record<string, { gold: number; wood: number }> = {};
    const actions: object[] = [];
    const off = gameEvents.subscribe(event => {
      if (event.type === 'COMMAND_SUCCEEDED')
        actions.push({
          turn: useGameLoopStore.getState().currentTurn,
          command: event.command,
        });
    });
    try {
      for (
        let step = 0;
        step < count * 60 && useGameLoopStore.getState().phase === 'inProgress';
        step++
      ) {
        const actor = useGameLoopStore.getState().activePlayer;
        const before = structuredClone(useEconomyStore.getState().resources);
        const result = await runAITurn(actor, {
          yieldControl: () => Promise.resolve(),
        });
        expect(result?.stalled).not.toBe(true);
        for (const p of participants) {
          if (p.id !== actor)
            expect(useEconomyStore.getState().resources[p.id]).toEqual(
              before[p.id],
            );
        }
        const obs = captureSnapshot();
        for (const p of participants)
          for (const contact of Object.values(
            obs.knowledge[p.id]?.contacts ?? {},
          ))
            expect(isHostile(p.id, contact.owner, participants)).toBe(true);
        income[actor] = { ...useEconomyStore.getState().resources[actor] };
      }
      const state = useGameLoopStore.getState();
      expect(state.phase).toBe('gameOver');
      expect(state.winner).not.toBeNull();
      expect(participants.find(p => p.id === state.winner)?.team).toBe(1);
      expect(useJournalStore.getState().errors).toEqual([]);
      writeFileSync(
        `/tmp/simplewar-p02-match-${count}.json`,
        JSON.stringify(
          {
            count,
            seed: 43,
            prepared: true,
            turns: state.currentTurn,
            winner: state.winner,
            eliminated: state.eliminated,
            stocks: income,
            actions,
          },
          null,
          2,
        ),
      );
    } finally {
      off();
    }
  },
  60000,
);
