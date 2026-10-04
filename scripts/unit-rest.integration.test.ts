import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_PARTICIPANTS,
  type Cell,
  type CommandMeta,
} from '@shared/config';
import { ok, reject } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { runCommand, useJournalStore } from '@entities/journals';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { move } from '@features/pathfinding';
import { attack } from '@features/combat';
import { setUnitRest } from '@features/game-loop';

const store = () => useUnitsStore.getState();
const spawn = (owner: 'p1' | 'p2' = 'p1') =>
  store().spawnUnit('swordsman', 1, 1, owner, true)!;
beforeEach(() => {
  store().resetStore();
  useBuildingsStore.getState().resetStore();
  useKnowledgeStore.setState({ byParticipant: {} });
  useJournalStore.getState().newGame();
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    participants: DEFAULT_PARTICIPANTS,
    eliminated: [],
  });
  const grid: Cell[][] = Array.from({ length: 5 }, (_, y) =>
    Array.from({ length: 5 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
});

describe('пропуск и сон', () => {
  it.each(['worker', 'swordsman', 'healer', 'siege'] as const)(
    'пропуск сжигает все очки %s; пробуждение их не возвращает',
    type => {
      const unitId = store().spawnUnit(type, 1, 1, 'p1', true)!;
      store().resetUnitsForNewTurn('p1');
      expect(setUnitRest({ actor: 'p1', unitId, mode: 'skip' })).toEqual(ok);
      const skipped = store().units[unitId];
      expect(skipped.movePoints).toBe(0);
      expect(
        skipped.role === 'civil' ? skipped.buildPoints : skipped.attackPoints,
      ).toBe(0);
      setUnitRest({ actor: 'p1', unitId, mode: 'sleep' });
      setUnitRest({ actor: 'p1', unitId, mode: null });
      expect(store().units[unitId]).toEqual({
        ...skipped,
        restMode: undefined,
      });
      expect(move({ actor: 'p1', unitId, x: 2, y: 1 })).toMatchObject({
        code: 'points',
      });
      store().resetUnitsForNewTurn('p1');
      const ready = store().units[unitId];
      expect(ready.movePoints).toBe(ready.maxMovePoints);
      expect(
        ready.role === 'civil' ? ready.buildPoints : ready.attackPoints,
      ).toBe(1);
    },
  );

  it('сон сериализуется, не списывает очки и снимается явно', () => {
    const unitId = spawn();
    const before = store().units[unitId];
    setUnitRest({ actor: 'p1', unitId, mode: 'sleep' });
    expect(store().units[unitId]).toEqual({ ...before, restMode: 'sleep' });
    // react-doctor-disable-next-line no-json-parse-stringify-clone -- Проверяем JSON-сериализацию состояния для сохранения, а не клонирование.
    expect(JSON.parse(JSON.stringify(store().units[unitId])).restMode).toBe(
      'sleep',
    );
    setUnitRest({ actor: 'p1', unitId, mode: null });
    expect(store().units[unitId]).toEqual(before);
    expect(useJournalStore.getState().entries.map(e => e.type)).toEqual([
      'rest',
      'rest',
    ]);
  });

  it('сбрасывает только свой пропуск, сон сохраняет и восстанавливает очки', () => {
    const skipped = spawn();
    const sleeping = spawn();
    const enemy = spawn('p2');
    store().setRestMode(skipped, 'skip');
    store().setRestMode(sleeping, 'sleep');
    store().setRestMode(enemy, 'skip');
    store().moveUnit(sleeping, 2, 1, 1);
    store().resetUnitsForNewTurn('p1');
    expect(store().units[skipped].restMode).toBeUndefined();
    expect(store().units[sleeping]).toMatchObject({
      restMode: 'sleep',
      movePoints: 3,
    });
    expect(store().units[enemy].restMode).toBe('skip');
  });

  it('чужой юнит, не свой ход и отсутствующий юнит отклоняются без изменения', () => {
    const unitId = spawn('p2');
    expect(setUnitRest({ actor: 'p1', unitId, mode: 'sleep' })).toMatchObject({
      code: 'owner',
    });
    expect(setUnitRest({ actor: 'p2', unitId, mode: 'sleep' })).toMatchObject({
      code: 'turn',
    });
    expect(
      setUnitRest({ actor: 'p1', unitId: 'missing', mode: 'skip' }),
    ).toMatchObject({ code: 'notFound' });
    expect(store().units[unitId].restMode).toBeUndefined();
  });

  it('прямое движение снимает сон без возврата очков', () => {
    const unitId = spawn();
    setUnitRest({ actor: 'p1', unitId, mode: 'sleep' });
    expect(move({ actor: 'p1', unitId, x: 2, y: 1 })).toEqual(ok);
    expect(store().units[unitId]).toMatchObject({ x: 2, movePoints: 2 });
    expect(store().units[unitId].restMode).toBeUndefined();
  });

  it('атакующий просыпается; получающий урон спящий не просыпается', () => {
    const attackerId = spawn();
    store().resetUnitsForNewTurn('p1');
    const targetId = store().spawnUnit('scout', 2, 1, 'p2', true)!;
    store().setRestMode(attackerId, 'sleep');
    store().setRestMode(targetId, 'sleep');
    expect(attack({ actor: 'p1', attackerId, targetId })).toEqual(ok);
    expect(store().units[attackerId].restMode).toBeUndefined();
    expect(store().units[targetId].restMode).toBe('sleep');
  });

  it('отказ прямого приказа оставляет сон и очки', () => {
    const unitId = spawn();
    setUnitRest({ actor: 'p1', unitId, mode: 'sleep' });
    const before = store().units[unitId];
    expect(move({ actor: 'p1', unitId, x: 20, y: 1 }).ok).toBe(false);
    expect(store().units[unitId]).toEqual(before);
  });

  it.each([
    ['build', 'workerId'],
    ['assign', 'workerId'],
    ['unassign', 'workerId'],
    ['repair', 'workerId'],
    ['clearForest', 'workerId'],
    ['prepareStrike', 'unitId'],
    ['heal', 'healerId'],
  ] as const)(
    'успешная команда %s будит исполнителя, отказ — нет',
    (type, key) => {
      const unitId = spawn();
      store().setRestMode(unitId, 'sleep');
      const meta: CommandMeta = {
        type,
        actor: 'p1',
        details: { [key]: unitId },
      };
      runCommand(meta, 1, () => reject('points'));
      expect(store().units[unitId].restMode).toBe('sleep');
      runCommand(meta, 1, () => ok);
      expect(store().units[unitId].restMode).toBeUndefined();
    },
  );
});
