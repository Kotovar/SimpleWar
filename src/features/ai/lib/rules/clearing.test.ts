import { describe, expect, it } from 'vite-plus/test';
import { cellOf, own, ownBuilding, scene } from '../scene.test-utils';
import { X01 } from './clearing';

describe('X01: полезная расчистка', () => {
  const wall = [
    '.....f...',
    '.....f...',
    '.....f...',
    '.....f..?',
    '.....f...',
    '.....f...',
    '.........',
  ];

  it('расчищает лес, заметно сокращающий путь к границе', () => {
    const worker = own('worker', 4, 3);
    const { ctx } = scene({
      map: wall,
      units: [worker],
      buildings: [ownBuilding('base', 1, 3)],
    });

    const [candidate] = X01.evaluate(ctx);

    expect(candidate).toMatchObject({
      ruleId: 'X01',
      action: { type: 'clearForest', workerId: worker.id },
    });
    const cell = cellOf(candidate.action);
    expect(ctx.known(cell.x, cell.y)).toBe('forest');
  });

  it('не расчищает, если обход короткий', () => {
    const map = [...wall];
    map[4] = '.........';
    const { ctx } = scene({
      map,
      units: [own('worker', 4, 3)],
      buildings: [ownBuilding('base', 1, 3)],
    });

    expect(X01.evaluate(ctx)).toEqual([]);
  });
});
