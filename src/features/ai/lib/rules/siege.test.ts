import { describe, expect, it } from 'vite-plus/test';
import {
  foe,
  grass,
  own,
  ownBuilding,
  remembered,
  scene,
} from '../scene.test-utils';
import { O02, O05, O06 } from './siege';

const map = grass(16, 16);

describe('O02: удар по зданию', () => {
  it('с прикрытием готовит удар по башне в дальности', () => {
    const tower = foe('tower', 9, 5);
    const siege = own('siege', 5, 5);
    const { ctx } = scene({
      map,
      units: [siege, own('swordsman', 6, 5)],
      enemies: [foe('barracks', 8, 8), tower],
    });

    expect(O02.evaluate(ctx)).toMatchObject([
      {
        action: { type: 'prepareStrike', unitId: siege.id, x: 9, y: 5 },
      },
    ]);
  });

  it('по юнитам не готовит: они уйдут до удара', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5), own('swordsman', 6, 5)],
      enemies: [foe('swordsman', 9, 5)],
    });

    expect(O02.evaluate(ctx)).toEqual([]);
  });

  it('без сопровождения под ближней угрозой отказывается', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5)],
      enemies: [foe('tower', 9, 5), foe('swordsman', 5, 8)],
    });

    expect(O02.evaluate(ctx)).toEqual([]);
  });

  it('здание в неразведанной клетке — скрытая цель, удара нет', () => {
    const fog = map.map((row, y) => (y === 5 ? '.........???????' : row));
    const { ctx } = scene({
      map: fog,
      units: [own('siege', 5, 5), own('swordsman', 6, 5)],
      contacts: [
        { ...remembered('swordsman', 9, 5), kind: 'building', type: 'tower' },
      ],
    });

    expect(O02.evaluate(ctx)).toEqual([]);
  });

  it('здание уже под отметкой удара — не дублирует', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5), own('swordsman', 6, 5)],
      enemies: [foe('tower', 9, 5)],
      strikes: [{ x: 9, y: 5 }],
    });

    expect(O02.evaluate(ctx)).toEqual([]);
  });

  it('удар уже подготовлен — второй нельзя', () => {
    const { ctx } = scene({
      map,
      units: [
        own('siege', 5, 5, { preparedStrike: { x: 9, y: 5 } }),
        own('swordsman', 6, 5),
      ],
      enemies: [foe('tower', 9, 5)],
    });

    expect(O02.evaluate(ctx)).toEqual([]);
  });

  it('цель ушла из памяти — удара нет', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5), own('swordsman', 6, 5)],
    });

    expect(O02.evaluate(ctx)).toEqual([]);
  });
});

describe('O05: защита орудия', () => {
  it('враг рядом — отступает', () => {
    const siege = own('siege', 5, 5);
    const { ctx } = scene({
      map,
      units: [siege],
      enemies: [foe('swordsman', 9, 5)],
    });

    const [candidate] = O05.evaluate(ctx);

    expect(candidate.action.type).toBe('move');
  });

  it('отступать некуда — законный удар по клетке врага', () => {
    const box = ['.......', '.^^^...', '.^.^...', '.^^^...', '.......'];
    const enemy = foe('swordsman', 5, 2);
    const { ctx } = scene({
      map: box,
      units: [own('siege', 2, 2)],
      enemies: [enemy],
    });

    expect(O05.evaluate(ctx)).toMatchObject([
      { action: { type: 'prepareStrike', x: 5, y: 2 } },
    ]);
  });

  it('без мобильного врага рядом ничего не делает', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5)],
      enemies: [foe('tower', 9, 5)],
    });

    expect(O05.evaluate(ctx)).toEqual([]);
  });
});

describe('O06: переоценка и расчистка осадой', () => {
  // Лесная стена с проходом далеко внизу: удар по лесу сокращает путь.
  const wall = [
    '....f.....',
    '....f.....',
    '....f.....',
    '....f.....',
    '....f.....',
    '....f.....',
    '..........',
  ];
  const operation = {
    phase: 'advance' as const,
    target: { x: 8, y: 0 },
    rally: null,
    since: 1,
  };

  it('лес на пути к цели — готовит удар для расчистки', () => {
    const { ctx } = scene({
      map: wall,
      units: [own('siege', 1, 1)],
      buildings: [ownBuilding('base', 0, 0)],
      memory: { operation },
    });

    const [candidate] = O06.evaluate(ctx);

    expect(candidate.action).toMatchObject({ type: 'prepareStrike', x: 4 });
  });

  it('известно здание врага — расчистка не нужна', () => {
    const { ctx } = scene({
      map: wall,
      units: [own('siege', 1, 1)],
      buildings: [ownBuilding('base', 0, 0)],
      enemies: [foe('farm', 8, 0)],
      memory: { operation },
    });

    expect(O06.evaluate(ctx)).toEqual([]);
  });
});

describe('O05: прикрытие рядом', () => {
  it('свои бойцы держат подход — орудие позицию не бросает', () => {
    const { ctx } = scene({
      map,
      units: [own('siege', 5, 5), own('swordsman', 6, 5)],
      enemies: [foe('swordsman', 9, 5)],
    });

    expect(O05.evaluate(ctx)).toEqual([]);
  });
});
