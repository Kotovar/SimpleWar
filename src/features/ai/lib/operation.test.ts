import { describe, expect, it } from 'vite-plus/test';
import type { AiOperation } from '@entities/ai-memories';
import { garrisonUnits, planOperation, strikeGroup } from './operation';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';

const map = grass(14, 14);
const base = () => ownBuilding('base', 2, 2);
const enemyBase = () => foe('base', 11, 11);

const operation = (patch: Partial<AiOperation>): AiOperation => ({
  phase: 'gather',
  target: null,
  rally: null,
  since: 0,
  ...patch,
});

describe('операция ударной группы', () => {
  it('неполная группа продолжает сбор', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 4, 2), own('swordsman', 5, 2)],
      buildings: [base()],
      enemies: [enemyBase()],
      turn: 3,
      memory: { strategy: 'G08', operation: operation({ since: 1 }) },
    });

    expect(planOperation(ctx).operation.phase).toBe('gather');
  });

  it('собранная группа выступает к известной цели', () => {
    const { ctx } = scene({
      map,
      units: [
        own('swordsman', 4, 3),
        own('swordsman', 3, 4),
        own('swordsman', 4, 4),
        own('archer', 5, 3),
      ],
      buildings: [base()],
      enemies: [enemyBase()],
      turn: 3,
      memory: { strategy: 'G08', operation: operation({ since: 1 }) },
    });

    expect(planOperation(ctx).operation).toMatchObject({
      phase: 'advance',
      target: { x: 11, y: 11 },
    });
  });

  it('по тайм-ауту сбора выступает даже без плана наступления', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 9, 2), own('swordsman', 2, 9)],
      buildings: [base()],
      enemies: [enemyBase()],
      turn: 10,
      memory: { strategy: 'G02', operation: operation({ since: 1 }) },
    });

    expect(planOperation(ctx).operation.phase).toBe('advance');
  });

  it('серьёзная угроза ратуше отзывает наступление', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 10, 10), own('swordsman', 9, 10)],
      buildings: [base()],
      enemies: [
        foe('swordsman', 4, 2),
        foe('swordsman', 2, 4),
        foe('archer', 5, 3),
      ],
      memory: {
        strategy: 'G08',
        operation: operation({ phase: 'advance', target: { x: 11, y: 11 } }),
      },
    });

    expect(planOperation(ctx).operation.phase).toBe('retreat');
  });

  it('одиночный слабый враг у ратуши не отзывает группу', () => {
    const { ctx } = scene({
      map,
      units: [
        own('swordsman', 3, 3),
        own('swordsman', 3, 2),
        own('swordsman', 10, 10),
        own('swordsman', 9, 10),
      ],
      buildings: [base()],
      enemies: [foe('swordsman', 6, 2, { hp: 20 }), enemyBase()],
      memory: {
        strategy: 'G08',
        operation: operation({ phase: 'advance', target: { x: 11, y: 11 } }),
      },
    });

    expect(planOperation(ctx).operation.phase).not.toBe('retreat');
  });

  it('потерянная цель сменяется границей разведки', () => {
    const fog = map.map((row, y) => (y === 13 ? '?'.repeat(14) : row));
    const { ctx } = scene({
      map: fog,
      units: [own('swordsman', 8, 8), own('swordsman', 9, 8)],
      buildings: [base()],
      memory: {
        strategy: 'G08',
        operation: operation({ phase: 'advance', target: { x: 11, y: 11 } }),
      },
    });

    const { target } = planOperation(ctx).operation;

    expect(target).not.toEqual({ x: 11, y: 11 });
    expect(ctx.frontier).toContainEqual(target);
  });

  it('юнит не состоит одновременно в гарнизоне, группе и задаче', () => {
    const scout = own('swordsman', 6, 6);
    const guard = own('swordsman', 3, 3);
    const striker = own('swordsman', 8, 8);
    const { ctx } = scene({
      map,
      units: [scout, guard, striker],
      buildings: [base()],
      memory: {
        garrison: [guard.id],
        tasks: [
          {
            id: 't1',
            kind: 'scout',
            ruleId: 'G05',
            unitId: scout.id,
            target: { x: 13, y: 13 },
            reserve: { gold: 0, wood: 0 },
            createdTurn: 1,
            reviewTurn: 9,
          },
        ],
      },
    });

    expect(strikeGroup(ctx).map(({ id }) => id)).toEqual([striker.id]);
    expect(garrisonUnits(ctx).map(({ id }) => id)).toEqual([guard.id]);
  });

  it('гарнизон набирается при тревоге из ближайших к ратуше', () => {
    const near = own('swordsman', 3, 3);
    const { ctx } = scene({
      map,
      units: [near, own('swordsman', 12, 12)],
      buildings: [base()],
      enemies: [foe('swordsman', 6, 2)],
    });

    expect(planOperation(ctx).garrison[0]).toBe(near.id);
  });
});
