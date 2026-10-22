import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useJournalStore } from '@entities/journals';
import { getParticipantKnowledge } from '@entities/perceptions';
import { initVisibilitySystem } from '@features/visibility';
import { nextTurn, resetGame, surrender } from '@features/game-loop';
import { initializeStandardGame } from '@widgets/start-game';
import { initPopulationSystem } from '@app/system';
import { captureSnapshot, applySnapshot } from './snapshot';
import { parseSnapshot } from './validation';

beforeEach(() => {
  initPopulationSystem();
  initVisibilitySystem();
  resetGame();
  const settings = useSettingsStore.getState();
  settings.setAiCount(3);
  for (const id of ['p1', 'p2'] as const) settings.setTeamChoice(id, 1);
  for (const id of ['p3', 'p4'] as const) settings.setTeamChoice(id, 2);
  const participants = initializeStandardGame()!;
  useGameLoopStore.getState().startGame(participants);
});

describe('сохранения командных партий', () => {
  it('сохраняет команды, настройки и общий обзор без передачи хода', () => {
    nextTurn('p1');
    const saved = captureSnapshot();
    resetGame();
    applySnapshot(saved);
    expect(captureSnapshot()).toEqual({
      ...saved,
      journal: saved.journal.map(entry => ({
        ...entry,
        gameId: useJournalStore.getState().gameId,
      })),
    });
    expect(useGameLoopStore.getState().participants.map(p => p.team)).toEqual([
      1, 1, 2, 2,
    ]);
    expect(useSettingsStore.getState().teamChoices).toEqual({
      p1: 1,
      p2: 1,
      p3: 2,
      p4: 2,
    });
  });

  it('восстанавливает наблюдение после выбывания человека и затем командную победу', () => {
    surrender('p1');
    const saved = captureSnapshot();
    applySnapshot(saved);
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'inProgress',
      activePlayer: 'p2',
      eliminated: ['p1'],
    });
    useUnitsStore.getState().spawnUnit('scout', 15, 15, 'p2', true);
    expect(getParticipantKnowledge('p1')?.visible[15 * 30 + 15]).toBe(1);
    surrender('p3');
    surrender('p4');
    const finished = captureSnapshot();
    resetGame();
    applySnapshot(finished);
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'gameOver',
      winner: 'p2',
    });
  });

  it('принимает победу двух живых союзников, отклоняет живого врага победителя', () => {
    surrender('p3');
    surrender('p4');
    const finished = captureSnapshot();
    expect(parseSnapshot(JSON.stringify(finished)).loop.winner).toBe('p1');
    finished.loop.participants[1].team = 2;
    expect(() => parseSnapshot(JSON.stringify(finished))).toThrow('исход');
  });

  it('старое сохранение без команд загружается как каждый сам за себя', () => {
    const old = JSON.parse(JSON.stringify(captureSnapshot()));
    delete old.rules.teamChoices;
    for (const participant of old.loop.participants) delete participant.team;
    applySnapshot(old);
    expect(
      useGameLoopStore.getState().participants.every(p => p.team === undefined),
    ).toBe(true);
    expect(useSettingsStore.getState().teamChoices).toEqual({
      p1: 1,
      p2: 2,
      p3: 3,
      p4: 4,
    });
  });

  it.each([0, 5, '1', null])(
    'отклоняет неверную команду %s до изменения мира',
    team => {
      const invalid = JSON.parse(JSON.stringify(captureSnapshot()));
      invalid.loop.participants[0].team = team;
      const before = useGameLoopStore.getState();
      expect(() => applySnapshot(invalid)).toThrow('неверные поля');
      expect(useGameLoopStore.getState()).toBe(before);
    },
  );

  it.each([
    [
      { p1: null, p2: null, p3: null, p4: null },
      { p1: 1, p2: 2, p3: 3, p4: 4 },
    ],
    [
      { p1: null, p2: 1, p3: 2, p4: 3 },
      { p1: 4, p2: 1, p3: 2, p4: 3 },
    ],
    [
      { p1: null, p2: null, p3: 1, p4: 1 },
      { p1: 2, p2: 3, p3: 1, p4: 1 },
    ],
  ])(
    'заменяет прежний выбор без команды на свободные команды: %j',
    (legacy, expected) => {
      const old = JSON.parse(JSON.stringify(captureSnapshot()));
      old.rules.teamChoices = legacy;
      applySnapshot(old);
      expect(useSettingsStore.getState().teamChoices).toEqual(expected);
      expect(useGameLoopStore.getState().participants.map(p => p.team)).toEqual(
        [1, 1, 2, 2],
      );
    },
  );
});
