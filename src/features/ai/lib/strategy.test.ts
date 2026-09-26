import { describe, expect, it } from 'vite-plus/test';
import type { StrategyId } from '@shared/config';
import type { RememberedContact } from '@entities/perceptions';
import type { StrategyScore } from '../model/types';
import { enemyPower } from './facts';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';
import { chooseStrategy, evaluateStrategies } from './strategy';

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
