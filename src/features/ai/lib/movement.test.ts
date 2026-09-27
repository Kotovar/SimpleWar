import { expect, it } from 'vite-plus/test';
import { stepToward, turnMoves } from './movement';
import { foe, own, ownBuilding, scene } from './scene.test-utils';

it('ИИ строит путь через своих, но не заканчивает ход на них', () => {
  const worker = own('worker', 0, 0, { movePoints: 3 });
  const { ctx } = scene({
    map: ['......'],
    units: [worker, own('worker', 1, 0), own('worker', 3, 0)],
  });
  expect(turnMoves(ctx, worker)).toEqual([{ x: 2, y: 0, cost: 2 }]);
  expect(stepToward(ctx, worker, [{ x: 5, y: 0 }])).toEqual({
    next: { x: 2, y: 0 },
    total: 5,
  });
  expect(ctx.occupied(1, 0)).toBe(true);
});

it.each(['enemy', 'building'] as const)(
  'ИИ не прокладывает транзит через %s',
  obstacle => {
    const worker = own('worker', 0, 0);
    const { ctx } = scene({
      map: ['....'],
      units: [worker, own('worker', 1, 0)],
      enemies: obstacle === 'enemy' ? [foe('worker', 2, 0)] : [],
      buildings: obstacle === 'building' ? [ownBuilding('mine', 2, 0)] : [],
    });
    expect(stepToward(ctx, worker, [{ x: 3, y: 0 }])).toBeNull();
  },
);

it('ИИ выбирает свободную цель, даже если занятая ближе', () => {
  const worker = own('worker', 0, 0);
  const { ctx } = scene({
    map: ['....'],
    units: [worker, own('worker', 1, 0)],
  });
  expect(
    stepToward(ctx, worker, [
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ]),
  ).toEqual({
    next: { x: 3, y: 0 },
    total: 3,
  });
});
