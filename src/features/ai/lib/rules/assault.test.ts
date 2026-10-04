import { describe, expect, it } from 'vite-plus/test';
import { manhattan } from '../geometry';
import {
  cellOf,
  foe,
  grass,
  own,
  ownBuilding,
  scene,
} from '../scene.test-utils';
import { M03, M04 } from './assault';

it('M04: в бою сближается с видимым противником, не проходит мимо к далёкой ратуше', () => {
  const unit = own('swordsman', 5, 5);
  const enemy = foe('archer', 8, 5);
  const { ctx } = scene({
    map: grass(16, 16),
    units: [unit],
    enemies: [enemy, foe('base', 14, 14)],
    memory: {
      operation: {
        phase: 'engage',
        target: { x: 14, y: 14 },
        rally: null,
        since: 1,
      },
    },
  });
  const [candidate] = M04.evaluate(ctx);
  expect(manhattan(cellOf(candidate.action), enemy)).toBe(1);
});

const map = grass(12, 12);

it('M04: доступная ратуша важнее ближайшей лесопилки рядом с ней', () => {
  const sword = own('swordsman', 5, 4);
  const base = foe('base', 8, 5);
  const { ctx } = scene({
    map,
    units: [sword],
    enemies: [base, foe('sawmill', 6, 4)],
    memory: {
      operation: {
        phase: 'advance',
        target: { x: base.x, y: base.y },
        rally: null,
        since: 1,
      },
    },
  });
  const [candidate] = M04.evaluate(ctx);
  // Путь обходит лесопилку; не заканчивается на её ближайшей клетке атаки.
  expect(manhattan(cellOf(candidate.action), base)).toBe(1);
});

describe('M03/M04: сбор и наступление', () => {
  const gather = {
    phase: 'gather' as const,
    rally: { x: 3, y: 3 },
    target: { x: 10, y: 10 },
    since: 0,
  };

  it('M03 ведёт мечника к месту сбора', () => {
    const sword = own('swordsman', 9, 9);
    const { ctx } = scene({
      map,
      units: [sword],
      buildings: [ownBuilding('base', 1, 1)],
      memory: { operation: gather },
    });

    const [candidate] = M03.evaluate(ctx);

    expect(candidate.ruleId).toBe('M03');
    expect(manhattan(cellOf(candidate.action), gather.rally)).toBeLessThan(
      manhattan(sword, gather.rally),
    );
  });

  it('M03 не двигает мечника, уже стоящего у места сбора', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 4, 3)],
      buildings: [ownBuilding('base', 1, 1)],
      memory: { operation: gather },
    });

    expect(M03.evaluate(ctx)).toEqual([]);
  });

  it('M03 возвращает здорового мечника после общего отхода', () => {
    const sword = own('swordsman', 9, 9);
    const { ctx } = scene({
      map,
      units: [sword],
      buildings: [ownBuilding('base', 1, 1)],
      memory: { operation: { ...gather, phase: 'retreat' } },
    });
    const [candidate] = M03.evaluate(ctx);
    expect(candidate).toBeDefined();
    expect(manhattan(cellOf(candidate.action), gather.rally)).toBeLessThan(
      manhattan(sword, gather.rally),
    );
  });

  it('M04 наступает на цель', () => {
    const sword = own('swordsman', 2, 2);
    const { ctx } = scene({
      map,
      units: [sword],
      memory: { operation: { ...gather, phase: 'advance' } },
    });

    const [candidate] = M04.evaluate(ctx);

    expect(candidate.ruleId).toBe('M04');
    expect(manhattan(cellOf(candidate.action), gather.target)).toBeLessThan(
      manhattan(sword, gather.target),
    );
  });

  it('M04 не наступает во время сбора', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 2, 2)],
      memory: { operation: gather },
    });

    expect(M04.evaluate(ctx)).toEqual([]);
  });
});

describe('M04: занятые подходы к цели', () => {
  // Карман у ратуши: лес, золото и край карты; входы (2,1) и (1,2).
  const pocket = ['...f..', '......', '......', 'g.....', '......', '......'];
  const advance = {
    phase: 'advance' as const,
    target: { x: 1, y: 1 },
    rally: null,
    since: 0,
  };

  it('атакующий во входе переходит глубже и освобождает подход', () => {
    const door = own('swordsman', 2, 1);
    const { ctx } = scene({
      map: pocket,
      units: [door, own('swordsman', 1, 2), own('swordsman', 4, 4)],
      enemies: [foe('base', 1, 1)],
      memory: { operation: advance },
    });

    const moves = M04.evaluate(ctx).filter(c => c.actorId === door.id);

    expect(moves).toMatchObject([
      {
        action: { type: 'move', x: 1, y: 0 },
        reason: 'освобождаю подход к цели',
      },
    ]);
  });

  it('отставший наступает через своих к свободной клетке атаки', () => {
    const late = own('swordsman', 4, 4);
    const { ctx } = scene({
      map: pocket,
      units: [own('swordsman', 2, 1), own('swordsman', 1, 2), late],
      enemies: [foe('base', 1, 1)],
      memory: { operation: advance },
    });

    const [move] = M04.evaluate(ctx).filter(c => c.actorId === late.id);

    expect(move.reason).toBe('наступаю на цель');
    const destination = cellOf(move.action);
    expect(ctx.occupied(destination.x, destination.y)).toBe(false);
    expect(manhattan(cellOf(move.action), advance.target)).toBeLessThan(
      manhattan(late, advance.target),
    );
  });

  it('без затора атакующий у цели не двигается', () => {
    const { ctx } = scene({
      map: grass(6, 6),
      units: [own('swordsman', 2, 1)],
      enemies: [foe('base', 1, 1)],
      memory: { operation: advance },
    });

    expect(M04.evaluate(ctx)).toEqual([]);
  });
});
