import { describe, expect, it } from 'vite-plus/test';
import { BUILDINGS_CONFIG } from '@shared/config';
import type { AiTask } from '@entities/ai-memories';
import type { Candidate } from '../model/types';
import { buildContext } from './context';
import { affordable, scarceResource } from './facts';
import { applyOutcome, createTurnState, refreshMemory } from './memory';
import { grass, own, ownBuilding, scene } from './scene.test-utils';

const buildTask = (unitId: string, patch: Partial<AiTask> = {}): AiTask => ({
  id: 't1',
  kind: 'build',
  ruleId: 'W05',
  unitId,
  target: { x: 5, y: 2 },
  buildingType: 'mine',
  reserve: BUILDINGS_CONFIG.mine.cost,
  createdTurn: 1,
  reviewTurn: 9,
  ...patch,
});

const walk = (
  unitId: string,
  task?: Candidate['task'],
  type: 'move' | 'build' = 'move',
): Candidate => ({
  ruleId: 'W05',
  group: 'build',
  actorId: unitId,
  action:
    type === 'move'
      ? { type: 'move', unitId, x: 1, y: 1 }
      : { type: 'build', workerId: unitId, buildingType: 'mine', x: 5, y: 2 },
  score: 50,
  reason: 'тест',
  task,
});

describe('задачи и резервы', () => {
  it('резерв задачи не входит в свободный бюджет', () => {
    const worker = own('worker', 1, 1);
    const { ctx } = scene({
      map: grass(8, 4),
      units: [worker],
      stock: { gold: 200, wood: 50 },
      memory: { tasks: [buildTask(worker.id)] },
    });

    expect(ctx.budget).toEqual({ gold: 80, wood: 50 });
  });

  it('успешная стройка закрывает задачу и освобождает резерв', () => {
    const worker = own('worker', 1, 1);
    const { memory, obs } = scene({
      map: grass(8, 4),
      units: [worker],
      stock: { gold: 200, wood: 50 },
      memory: { tasks: [buildTask(worker.id)] },
    });

    const next = applyOutcome(
      memory,
      walk(worker.id, undefined, 'build'),
      true,
      5,
      8,
    );

    expect(next.tasks).toEqual([]);
    expect(buildContext(obs, next, createTurnState()).budget).toEqual({
      gold: 200,
      wood: 50,
    });
  });

  it('у юнита одна задача: новая заменяет прежнюю', () => {
    const worker = own('worker', 1, 1);
    const { memory } = scene({
      map: grass(8, 4),
      units: [worker],
      memory: { tasks: [buildTask(worker.id)], nextTaskId: 2 },
    });

    const next = applyOutcome(
      memory,
      walk(worker.id, {
        kind: 'build',
        ruleId: 'W06',
        unitId: worker.id,
        target: { x: 3, y: 3 },
        buildingType: 'farm',
        reserve: BUILDINGS_CONFIG.farm.cost,
      }),
      true,
      5,
      8,
    );

    expect(next.tasks).toHaveLength(1);
    expect(next.tasks[0]).toMatchObject({
      id: 't2',
      ruleId: 'W06',
      createdTurn: 5,
      reviewTurn: 13,
    });
  });

  it('отказ команды не создаёт задачу', () => {
    const { memory } = scene({ map: grass(4, 4) });
    const task: Candidate['task'] = {
      kind: 'scout',
      ruleId: 'G05',
      unitId: 'u1',
      target: { x: 3, y: 3 },
      reserve: { gold: 0, wood: 0 },
    };

    expect(applyOutcome(memory, walk('u1', task), false, 5, 8)).toBe(memory);
  });

  it('пересмотр снимает задачи погибших, просроченные и с занятой площадкой', () => {
    const alive = own('worker', 1, 1);
    const late = own('worker', 2, 1);
    const blocked = own('worker', 3, 1);
    const kept = buildTask(alive.id, {
      id: 'ok',
      target: { x: 6, y: 3 },
      reviewTurn: 12,
    });
    const { ctx } = scene({
      map: grass(8, 4),
      units: [alive, late, blocked],
      buildings: [ownBuilding('farm', 5, 2)],
      turn: 10,
      memory: {
        tasks: [
          kept,
          buildTask('dead', { id: 'dead' }),
          buildTask(late.id, { id: 'late', reviewTurn: 9 }),
          buildTask(blocked.id, { id: 'busy', reviewTurn: 12 }),
        ],
      },
    });

    expect(refreshMemory(ctx).memory.tasks.map(({ id }) => id)).toEqual(['ok']);
  });

  it('накопление: цель ниже по важности не тратит отложенное на более важную', () => {
    const map = ['........', '.g......', '........', '........'];
    const { ctx } = scene({
      map,
      units: [own('worker', 3, 3)],
      buildings: [ownBuilding('base', 5, 2)],
      stock: { gold: 150, wood: 500 },
    });

    expect(affordable(ctx, BUILDINGS_CONFIG.mine.cost, 'mine')).toBe(true);
    expect(affordable(ctx, BUILDINGS_CONFIG.barracks.cost, 'barracks')).toBe(
      false,
    );
  });

  it('дефицитный ресурс меняется вместе с запасами', () => {
    const lowGold = scene({
      map: grass(6, 6),
      buildings: [ownBuilding('base', 2, 2)],
      stock: { gold: 0, wood: 500 },
    });
    const lowWood = scene({
      map: grass(6, 6),
      buildings: [ownBuilding('base', 2, 2)],
      stock: { gold: 500, wood: 0 },
    });

    expect(scarceResource(lowGold.ctx)).toBe('gold');
    expect(scarceResource(lowWood.ctx)).toBe('wood');
  });
});
