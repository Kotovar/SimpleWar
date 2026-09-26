import { describe, expect, it } from 'vite-plus/test';
import type { RememberedContact } from '@entities/perceptions';
import { manhattan } from '../geometry';
import {
  cellOf,
  foe,
  grass,
  own,
  ownBuilding,
  scene,
} from '../scene.test-utils';
import { G05, G07, G10 } from './scouting';

/** Правая часть карты не разведана. */
const unexplored = Array.from({ length: 12 }, () => '........????');

const staleContact = (x: number, y: number): RememberedContact => ({
  ...foe('swordsman', x, y),
  seenTurn: 1,
  confidence: 'stale',
});

describe('G05: разведка границ', () => {
  it('отправляет свободного военного к дальней границе с задачей', () => {
    const scout = own('swordsman', 3, 3);
    const { ctx } = scene({
      map: unexplored,
      units: [scout, own('swordsman', 2, 3)],
      buildings: [ownBuilding('base', 2, 2)],
    });

    const [candidate] = G05.evaluate(ctx);

    expect(candidate).toMatchObject({
      ruleId: 'G05',
      action: { type: 'move' },
      task: { kind: 'scout', ruleId: 'G05' },
    });
    expect(ctx.frontier).toContainEqual(candidate.task?.target);
  });

  it('не ищет базу, когда вражеское здание известно', () => {
    const { ctx } = scene({
      map: unexplored,
      units: [own('swordsman', 3, 3), own('swordsman', 2, 3)],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [foe('base', 7, 9)],
    });

    expect(G05.evaluate(ctx)).toEqual([]);
  });
});

describe('G07: проверка старого контакта', () => {
  it('отправляет военного к месту устаревшего контакта', () => {
    const contact = staleContact(9, 9);
    const scout = own('swordsman', 3, 3);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [scout],
      buildings: [ownBuilding('base', 2, 2)],
      contacts: [contact],
    });

    const [candidate] = G07.evaluate(ctx);

    expect(candidate).toMatchObject({
      ruleId: 'G07',
      task: { kind: 'scout', target: { x: 9, y: 9 } },
    });
    expect(manhattan(cellOf(candidate.action), contact)).toBeLessThan(
      manhattan(scout, contact),
    );
  });

  it('не перепроверяет свежий контакт', () => {
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('swordsman', 3, 3)],
      buildings: [ownBuilding('base', 2, 2)],
      contacts: [{ ...staleContact(9, 9), confidence: 'recent' }],
    });

    expect(G07.evaluate(ctx)).toEqual([]);
  });
});

describe('G10: гарнизон', () => {
  it('возвращает гарнизон к ратуше', () => {
    const guard = own('swordsman', 10, 10);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [guard],
      buildings: [ownBuilding('base', 2, 2)],
      memory: { garrison: [guard.id] },
    });

    const [candidate] = G10.evaluate(ctx);

    expect(candidate.ruleId).toBe('G10');
    expect(manhattan(cellOf(candidate.action), { x: 2, y: 2 })).toBeLessThan(
      manhattan(guard, { x: 2, y: 2 }),
    );
  });

  it('не трогает военных вне гарнизона', () => {
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('swordsman', 10, 10)],
      buildings: [ownBuilding('base', 2, 2)],
    });

    expect(G10.evaluate(ctx)).toEqual([]);
  });
});
