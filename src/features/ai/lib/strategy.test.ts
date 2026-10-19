import { describe, expect, it } from 'vite-plus/test';
import type { StrategyId } from '@shared/config';
import type { RememberedContact } from '@entities/perceptions';
import type { StrategyScore } from '../model/types';
import { enemyPower } from './composition';
import {
  foe,
  grass,
  own,
  ownBuilding,
  remembered,
  scene,
} from './scene.test-utils';
import { chooseStrategy, evaluateStrategies, STRATEGIES } from './strategy';

/** Оценки всех стратегий: заданные — как указано, остальные — ноль. */
const scores = (values: Partial<Record<StrategyId, number>>): StrategyScore[] =>
  (
    [
      'G01',
      'G02',
      'G03',
      'G04',
      'G05',
      'G06',
      'G07',
      'G08',
      'G09',
      'G10',
      'G11',
      'G12',
    ] as const
  ).map(id => ({ id, score: values[id] ?? 0, reason: 'тест' }));

it('G01: один лекарь у ратуши не вызывает срочную оборону', () => {
  const { ctx } = scene({
    map: grass(16, 16),
    buildings: [ownBuilding('base', 2, 2)],
    enemies: [foe('healer', 3, 2)],
  });
  expect(STRATEGIES.G01(ctx).score).toBe(0);
});

it('G05: известная лесопилка не заменяет найденную вражескую ратушу', () => {
  const { ctx } = scene({
    map: grass(16, 16),
    buildings: [ownBuilding('base', 2, 2)],
    enemies: [foe('sawmill', 10, 10)],
  });
  expect(STRATEGIES.G05(ctx).score).toBeGreaterThan(0);
});

const choose = (
  strategy: StrategyId,
  since: number,
  values: Partial<Record<StrategyId, number>>,
  turn = 10,
) => {
  const { ctx } = scene({
    map: grass(6, 6),
    turn,
    memory: { strategy, strategySince: since },
  });
  return chooseStrategy(ctx, scores(values));
};

describe('выбор стратегии', () => {
  it('срочная оборона (G01) сразу прерывает экономику', () => {
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('worker', 3, 3)],
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [foe('swordsman', 4, 4)],
      turn: 5,
      memory: { strategy: 'G02', strategySince: 5 },
    });

    const { memory, chosen } = chooseStrategy(ctx, evaluateStrategies(ctx));

    expect(chosen.id).toBe('G01');
    expect(memory).toMatchObject({ strategy: 'G01', strategySince: 5 });
  });

  it('держит план в срок удержания даже при лучшей оценке', () => {
    const { memory } = choose('G02', 9, { G02: 20, G04: 70 });

    expect(memory.strategy).toBe('G02');
  });

  it('слабое изменение оценки не меняет план', () => {
    const { memory } = choose('G02', 0, { G02: 40, G04: 54 });

    expect(memory.strategy).toBe('G02');
  });

  it('заметно лучшая стратегия сменяет план после удержания', () => {
    const { memory } = choose('G02', 0, { G02: 40, G04: 55 });

    expect(memory).toMatchObject({ strategy: 'G04', strategySince: 10 });
  });

  it('обнулившийся план сменяется сразу', () => {
    const { memory } = choose('G08', 9, { G02: 30 });

    expect(memory.strategy).toBe('G02');
  });

  it('снятая тревога отпускает оборону', () => {
    const { memory } = choose('G01', 9, { G02: 30 });

    expect(memory.strategy).toBe('G02');
  });

  it('равные оценки разрешаются по сиду одинаково', () => {
    const { ctx } = scene({ map: grass(6, 6), memory: { strategy: 'G12' } });
    const tied = scores({ G03: 40, G04: 40 });

    const first = chooseStrategy(ctx, tied).chosen.id;

    expect(chooseStrategy(ctx, tied).chosen.id).toBe(first);
    expect(chooseStrategy(ctx, [...tied].reverse()).chosen.id).toBe(first);
  });

  it('исследования (G12) не выбираются: их ещё нет', () => {
    const { ctx } = scene({ map: grass(6, 6) });

    expect(evaluateStrategies(ctx)).toContainEqual(
      expect.objectContaining({ id: 'G12', score: 0 }),
    );
  });
});

describe('знание о враге', () => {
  const contact = (
    confidence: RememberedContact['confidence'],
  ): RememberedContact => ({
    ...foe('swordsman', 6, 5),
    seenTurn: 1,
    confidence,
  });
  const view = (confidence: RememberedContact['confidence']) =>
    scene({
      map: grass(12, 12),
      units: [own('swordsman', 2, 2)],
      contacts: [contact(confidence)],
    }).ctx;

  it('устаревший контакт весит меньше свежего', () => {
    const recent = view('recent');
    const stale = view('stale');

    expect(stale.remembered[0].certainty).toBeLessThan(
      recent.remembered[0].certainty,
    );
    expect(enemyPower(stale)).toBeLessThan(enemyPower(recent));
    expect(stale.threatAt({ x: 5, y: 5 })).toBeLessThan(
      recent.threatAt({ x: 5, y: 5 }),
    );
  });

  it('контакт из памяти не становится видимым врагом', () => {
    expect(view('recent').enemies).toEqual([]);
  });
});

describe('S21: применимость каждой стратегии G01–G12', () => {
  type Spec = Parameters<typeof scene>[0];
  const field = grass(16, 16);
  const army = () => [0, 1, 2, 3].map(i => own('swordsman', 4 + i, 4));
  const base = () => ownBuilding('base', 2, 2);
  const staffed = (): Spec => {
    const mine = ownBuilding('mine', 5, 5);
    const mill = ownBuilding('sawmill', 6, 5);
    return {
      map: field,
      buildings: [base(), mine, mill],
      units: [
        own('worker', 5, 5, { workplaceId: mine.id }),
        own('worker', 6, 5, { workplaceId: mill.id }),
        own('worker', 1, 1),
      ],
    };
  };
  const cases: Array<{ id: StrategyId; yes: Spec; no: Spec; reason: string }> =
    [
      {
        id: 'G01',
        reason: 'вооружённый враг у ратуши / тревоги нет',
        yes: {
          map: field,
          buildings: [base()],
          enemies: [foe('swordsman', 4, 2)],
        },
        no: { map: field, buildings: [base()] },
      },
      {
        id: 'G02',
        reason: 'добыча без рабочих / места обслужены и доход достаточен',
        yes: { map: field, buildings: [base(), ownBuilding('mine', 5, 5)] },
        no: staffed(),
      },
      {
        id: 'G03',
        reason: 'известное свободное золото / простаивает рудник',
        yes: { map: ['..g..', ...grass(5, 4)], buildings: [base()] },
        no: {
          map: ['..g..', ...grass(5, 4)],
          buildings: [base(), ownBuilding('mine', 1, 4)],
        },
      },
      {
        id: 'G04',
        reason: 'армии мало / армия и население достаточны',
        yes: { map: field },
        no: {
          map: field,
          units: Array.from({ length: 10 }, (_, i) => own('swordsman', i, 5)),
          population: { max: 30, occupied: 10 },
        },
      },
      {
        id: 'G05',
        reason: 'база неизвестна / вражеское здание известно',
        yes: { map: field },
        no: { map: field, enemies: [foe('base', 14, 14)] },
      },
      {
        id: 'G06',
        reason: 'ресурс не найден / золото и лес известны',
        yes: { map: field },
        no: { map: ['..g.f', ...grass(5, 4)] },
      },
      {
        id: 'G07',
        reason: 'устаревший / свежий контакт',
        yes: {
          map: field,
          contacts: [remembered('swordsman', 12, 12, 'stale')],
        },
        no: { map: field, contacts: [remembered('swordsman', 12, 12)] },
      },
      {
        id: 'G08',
        reason: 'готовая сильная группа / бойцов нет',
        yes: { map: field, units: army() },
        no: { map: field },
      },
      {
        id: 'G09',
        reason: 'незащищённый рабочий / охрана у рабочего',
        yes: { map: field, units: army(), enemies: [foe('worker', 12, 12)] },
        no: {
          map: field,
          units: army(),
          enemies: [foe('worker', 12, 12), foe('swordsman', 12, 11)],
        },
      },
      {
        id: 'G10',
        reason: 'враг на подходе / прямое нападение требует G01',
        yes: {
          map: field,
          buildings: [base()],
          enemies: [foe('swordsman', 10, 2)],
        },
        no: {
          map: field,
          buildings: [base()],
          enemies: [foe('swordsman', 4, 2)],
        },
      },
      {
        id: 'G11',
        reason: 'проигрышный бой / сбор вне боя',
        yes: {
          map: field,
          units: army(),
          enemies: [foe('griffon', 7, 7)],
          memory: {
            operation: {
              phase: 'engage',
              rally: null,
              target: { x: 14, y: 14 },
              since: 0,
            },
          },
        },
        no: { map: field, units: army(), enemies: [foe('griffon', 7, 7)] },
      },
      {
        id: 'G12',
        reason: 'Строй полезен / кузница уже занята',
        yes: {
          map: field,
          units: [own('spearman', 4, 4), own('spearman', 5, 4)],
          buildings: [ownBuilding('forge', 2, 2)],
        },
        no: {
          map: field,
          units: [own('spearman', 4, 4), own('spearman', 5, 4)],
          buildings: [ownBuilding('forge', 2, 2)],
          researching: 'formation',
        },
      },
    ];
  it.each(cases)('$id: $reason', ({ id, yes, no }) => {
    expect(STRATEGIES[id](scene(yes).ctx).score).toBeGreaterThan(0);
    expect(STRATEGIES[id](scene(no).ctx).score).toBe(0);
  });
});
