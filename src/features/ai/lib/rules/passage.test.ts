import { describe, expect, it } from 'vite-plus/test';
import { cellOf, grass, own, ownBuilding, scene } from '../scene.test-utils';
import { W10 } from './passage';

describe('W10: освободить проход', () => {
  const ring = (x: number, y: number) =>
    [-1, 0, 1].flatMap(dy =>
      [-1, 0, 1].flatMap(dx =>
        dx || dy ? [own('worker', x + dx, y + dy)] : [],
      ),
    );

  it('свой юнит уступает выход найма у ратуши', () => {
    const base = ownBuilding('base', 2, 2);
    const { ctx } = scene({
      map: grass(8, 8),
      units: ring(2, 2),
      buildings: [base],
    });

    const [candidate] = W10.evaluate(ctx);

    expect(candidate).toMatchObject({
      ruleId: 'W10',
      action: { type: 'move' },
    });
    const cell = cellOf(candidate.action);
    expect(Math.max(Math.abs(cell.x - 2), Math.abs(cell.y - 2))).toBe(2);
  });

  it('сносит своё здание, если ратуша замурована', () => {
    const farms = [
      ownBuilding('farm', 1, 0),
      ownBuilding('farm', 0, 1),
      ownBuilding('farm', 1, 1),
    ];
    const { ctx } = scene({
      map: grass(6, 6),
      buildings: [ownBuilding('base', 0, 0), ...farms],
    });

    const [candidate] = W10.evaluate(ctx);

    expect(candidate.action.type).toBe('demolish');
    expect(farms.map(({ id }) => id)).toContain(candidate.actorId);
  });

  it('молчит, когда выход свободен и группа не застряла', () => {
    const { ctx } = scene({
      map: grass(8, 8),
      units: ring(2, 2).slice(1),
      buildings: [ownBuilding('base', 2, 2)],
    });

    expect(W10.evaluate(ctx)).toEqual([]);
  });

  it('уступает проход застрявшей ударной группе', () => {
    const worker = own('worker', 2, 1);
    const { ctx } = scene({
      map: ['^^^^^^^^', '........', '^^^.^^^^', '^^^^^^^^'],
      units: [own('swordsman', 0, 1), worker],
      memory: {
        operation: {
          phase: 'gather',
          rally: { x: 7, y: 1 },
          target: null,
          since: 0,
        },
      },
    });

    expect(W10.evaluate(ctx)).toMatchObject([
      {
        ruleId: 'W10',
        actorId: worker.id,
        action: { type: 'move', x: 3, y: 2 },
      },
    ]);
  });
});
