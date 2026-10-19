import { describe, expect, it } from 'vite-plus/test';
import { manhattan } from '../geometry';
import { cellOf, foe, grass, own, scene } from '../scene.test-utils';
import { O01, O03, O04, X02 } from './siegeMoves';

const map = grass(16, 16);

describe('O01: осада с группой', () => {
  it('идёт за передним бойцом, не обгоняя его', () => {
    const target = { x: 15, y: 5 };
    const siege = own('siege', 1, 5);
    const sword = own('swordsman', 6, 5);
    const { ctx } = scene({
      map,
      units: [siege, sword],
      memory: {
        operation: { phase: 'advance', target, rally: null, since: 1 },
      },
    });

    const [candidate] = O01.evaluate(ctx);
    const cell = cellOf(candidate.action);

    expect(cell.x).toBeGreaterThan(siege.x);
    expect(manhattan(cell, target)).toBeGreaterThanOrEqual(
      manhattan(sword, target),
    );
  });

  it('без прикрытия в группе вперёд не идёт', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 1, 5)],
      memory: {
        operation: {
          phase: 'advance',
          target: { x: 15, y: 5 },
          rally: null,
          since: 1,
        },
      },
    });

    expect(O01.evaluate(ctx)).toEqual([]);
  });
});

describe('O03: огневая позиция', () => {
  it('при общем отходе не уводит осаду обратно к вражескому зданию', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 2, 5), own('swordsman', 4, 5)],
      enemies: [foe('tower', 14, 5)],
      memory: {
        operation: {
          phase: 'retreat',
          target: { x: 14, y: 5 },
          rally: { x: 1, y: 1 },
          since: 1,
        },
      },
    });
    expect(O03.evaluate(ctx)).toEqual([]);
    expect(O01.evaluate(ctx)).not.toEqual([]);
  });
  it('идёт к клетке в дальности цели рядом с прикрытием', () => {
    const tower = foe('tower', 14, 5);
    const siege = own('siege', 2, 5);
    const { ctx } = scene({
      map,
      units: [siege, own('swordsman', 4, 5)],
      enemies: [tower],
    });

    const [candidate] = O03.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), tower)).toBeLessThan(
      manhattan(siege, tower),
    );
  });

  it('цель уже в дальности — позиция занята', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5), own('swordsman', 6, 5)],
      enemies: [foe('tower', 9, 5)],
    });

    expect(O03.evaluate(ctx)).toEqual([]);
  });
});

describe('O04: ожидание прикрытия', () => {
  it('без прикрытия и угрозы ждёт на месте', () => {
    const siege = own('siege', 2, 5);
    const { ctx } = scene({
      map,
      units: [siege, own('swordsman', 12, 12)],
    });

    expect(O04.evaluate(ctx)).toMatchObject([
      { action: { type: 'wait', actorId: siege.id } },
    ]);
  });

  it('под угрозой отходит к отставшему прикрытию', () => {
    const siege = own('siege', 5, 5);
    const sword = own('swordsman', 12, 12);
    const { ctx } = scene({
      map,
      units: [siege, sword],
      enemies: [foe('archer', 2, 5)],
    });

    const [candidate] = O04.evaluate(ctx);

    expect(candidate.action.type).toBe('move');
    expect(manhattan(cellOf(candidate.action), sword)).toBeLessThan(
      manhattan(siege, sword),
    );
  });

  it('прикрытие рядом — ждать нечего', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5), own('swordsman', 6, 5)],
    });

    expect(O04.evaluate(ctx)).toEqual([]);
  });
});

describe('X02: уход из-под отметки удара', () => {
  it('свой юнит на отметке уходит с неё', () => {
    const sword = own('swordsman', 5, 5);
    const { ctx } = scene({
      map,
      units: [sword],
      strikes: [{ x: 5, y: 5 }],
    });

    const [candidate] = X02.evaluate(ctx);

    expect(ctx.struck(cellOf(candidate.action))).toBe(false);
  });

  it('летающего удар не задевает — остаётся', () => {
    const { ctx } = scene({
      map,
      units: [own('griffon', 5, 5)],
      strikes: [{ x: 5, y: 5 }],
    });

    expect(X02.evaluate(ctx)).toEqual([]);
  });

  it('без отметки не двигается', () => {
    const { ctx } = scene({ map, units: [own('swordsman', 5, 5)] });

    expect(X02.evaluate(ctx)).toEqual([]);
  });
});
