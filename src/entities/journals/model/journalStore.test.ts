import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { reject } from '@shared/lib';
import { DECISION_LIMIT, type AiDecisionInput } from './decisions';
import {
  JOURNAL_LIMIT,
  getVisibleRecords,
  runCommand,
  useJournalStore,
} from './journalStore';

const journal = () => useJournalStore.getState();

describe('useJournalStore', () => {
  beforeEach(() => journal().newGame());

  it('записывает успех в события, отказ — в ошибки', () => {
    runCommand({ type: 'move', actor: 'p1' }, 3, () => ({ ok: true }));
    runCommand({ type: 'move', actor: 'p1' }, 3, () => reject('points'));

    expect(journal().entries).toMatchObject([
      { type: 'move', actor: 'p1', turn: 3 },
    ]);
    expect(journal().errors).toMatchObject([
      { type: 'move', code: 'points', kind: 'rejected', count: 1 },
    ]);
  });

  it('склеивает повтор одинаковой ошибки подряд', () => {
    const meta = { type: 'build', actor: 'p1' } as const;
    runCommand(meta, 1, () => reject('resources'));
    runCommand(meta, 2, () => reject('resources'));
    runCommand(meta, 2, () => reject('points'));
    runCommand({ ...meta, details: { x: 1 } }, 2, () => reject('points'));

    expect(journal().errors).toMatchObject([
      { code: 'resources', count: 2, turn: 2 },
      { code: 'points', count: 1 },
      { code: 'points', count: 1, details: { x: 1 } },
    ]);
  });

  it('превращает исключение в сбой, отличимый от отказа', () => {
    const result = runCommand({ type: 'attack', actor: 'p2' }, 1, () => {
      throw new Error('сломалось');
    });

    expect(result).toMatchObject({
      ok: false,
      kind: 'failure',
      detail: 'сломалось',
    });
    expect(journal().errors[0].kind).toBe('failure');
    expect(getVisibleRecords(journal().errors, 'p2')[0]).not.toHaveProperty(
      'detail',
    );
  });

  it('очищает ошибки, не трогая события', () => {
    runCommand({ type: 'move', actor: 'p1' }, 1, () => ({ ok: true }));
    runCommand({ type: 'move', actor: 'p1' }, 1, () => reject('path'));
    journal().clearErrors();

    expect(journal().errors).toEqual([]);
    expect(journal().entries).toHaveLength(1);
  });

  it('разделяет партии и не переносит записи в новую', () => {
    const { gameId } = journal();
    runCommand({ type: 'endTurn', actor: 'p1' }, 1, () => ({ ok: true }));
    journal().newGame();
    runCommand({ type: 'endTurn', actor: 'p1' }, 1, () => ({ ok: true }));

    expect(journal().entries).toHaveLength(1);
    expect(journal().entries[0].gameId).toBe(gameId + 1);
  });

  it('хранит не больше лимита записей, вытесняя старые', () => {
    for (let turn = 0; turn < JOURNAL_LIMIT + 5; turn++) {
      runCommand({ type: 'endTurn', actor: 'p1' }, turn, () => ({ ok: true }));
    }

    expect(journal().entries).toHaveLength(JOURNAL_LIMIT);
    expect(journal().entries[0].turn).toBe(5);
  });

  it('показывает участнику только видимые ему записи', () => {
    runCommand({ type: 'move', actor: 'p1' }, 1, () => ({ ok: true }));
    runCommand(
      { type: 'move', actor: 'p2', details: { x: 9, y: 9 } },
      1,
      () => ({ ok: true }),
    );
    journal().record({
      type: 'unitDestroyed',
      actor: 'p2',
      turn: 1,
      visibleTo: ['p2', 'p1'],
    });
    journal().record({
      type: 'eliminated',
      actor: null,
      turn: 1,
      visibleTo: 'all',
    });

    const visible = getVisibleRecords(journal().entries, 'p1');
    expect(visible.map(({ type }) => type)).toEqual([
      'move',
      'unitDestroyed',
      'eliminated',
    ]);
    expect(JSON.stringify(visible)).not.toContain('"x":9');
  });

  it('решения ИИ хранятся отдельно, ограниченно и сбрасываются с партией', () => {
    const decision = (step: number): AiDecisionInput => ({
      actor: 'p2',
      turn: 1,
      step,
      strategy: 'G02',
      ruleId: 'W02',
      actorId: 'u1',
      action: 'на добычу',
      reason: 'тест',
      basis: {},
      alternatives: [],
      result: 'ok',
    });

    for (let step = 1; step <= DECISION_LIMIT + 5; step++) {
      journal().recordDecision(decision(step));
    }

    expect(journal().decisions).toHaveLength(DECISION_LIMIT);
    expect(journal().decisions[0].step).toBe(6);
    expect(journal().entries).toEqual([]);

    journal().newGame();
    expect(journal().decisions).toEqual([]);
  });
});
