import { describe, expect, it } from 'vite-plus/test';
import { RESEARCH_CONFIG } from '@shared/config';
import { foe, grass, own, ownBuilding, scene } from '../scene.test-utils';
import { STRATEGIES } from '../strategy';
import { N04, bestResearch } from './research';

/** Ратуша, кузница, казармы и пара копейщиков: Строй полезен. */
const spearScene = (patch: Parameters<typeof scene>[0] | object = {}) =>
  scene({
    map: grass(10, 10),
    units: [
      own('worker', 0, 0),
      own('worker', 0, 1),
      own('spearman', 6, 6),
      own('spearman', 7, 7),
    ],
    buildings: [
      ownBuilding('base', 1, 1),
      ownBuilding('forge', 3, 1),
      ownBuilding('barracks', 1, 3),
    ],
    ...patch,
  });

describe('N04: исследование', () => {
  it('запускает Строй, когда в армии есть пара копейщиков', () => {
    const { ctx } = spearScene();

    expect(N04.evaluate(ctx)).toMatchObject([
      { action: { type: 'startResearch', research: 'formation' } },
    ]);
  });

  it('бесполезное исследование не запускается', () => {
    const { ctx } = spearScene({
      units: [own('worker', 0, 0), own('worker', 0, 1)],
    });

    expect(bestResearch(ctx)).toBeNull();
    expect(N04.evaluate(ctx)).toEqual([]);
  });

  it('уже изученное не повторяется', () => {
    const { ctx } = spearScene({ researched: ['formation'] });

    expect(bestResearch(ctx)?.type).not.toBe('formation');
  });

  it('пока кузница занята, новое не начинается', () => {
    const { ctx } = spearScene({ researching: 'artel' });

    expect(N04.evaluate(ctx)).toEqual([]);
  });

  it('без кузницы исследования нет', () => {
    const { ctx } = spearScene({
      buildings: [ownBuilding('base', 1, 1), ownBuilding('barracks', 1, 3)],
    });

    expect(N04.evaluate(ctx)).toEqual([]);
  });

  it('без минимальной армии цена не вытесняет найм', () => {
    const { cost } = RESEARCH_CONFIG.cartography;
    const stock = { ...cost };
    const army = (units: ReturnType<typeof own>[]) =>
      N04.evaluate(
        spearScene({
          units: [own('worker', 0, 0), own('worker', 0, 1), ...units],
          stock,
        }).ctx,
      );

    // Один разведчик: запас отложен на солдата.
    expect(army([own('scout', 5, 5)])).toEqual([]);
    // Оборона из двух есть: исследование копится раньше армии.
    expect(army([own('scout', 5, 5), own('swordsman', 6, 6)])).toHaveLength(1);
  });

  it('при нападении мирное улучшение не тратит резерв', () => {
    const units = [
      own('worker', 0, 0),
      own('worker', 0, 1),
      own('scout', 5, 5),
    ];
    const calm = spearScene({ units, researched: ['engineering'] });
    const { ctx } = spearScene({
      units,
      enemies: [foe('swordsman', 2, 2), foe('swordsman', 3, 3)],
      researched: ['engineering'],
    });

    expect(N04.evaluate(calm.ctx)).toMatchObject([
      { action: { research: 'cartography' } },
    ]);
    expect(N04.evaluate(ctx)).toEqual([]);
  });

  it('при нападении военное улучшение — только с запасом на оборону', () => {
    const enemies = [foe('rider', 2, 2)];
    const { cost } = RESEARCH_CONFIG.formation;
    const rich = spearScene({ enemies, turn: 1 });
    const poor = spearScene({
      enemies,
      turn: 1,
      stock: { gold: cost.gold + 10, wood: cost.wood + 10 },
    });

    expect(N04.evaluate(rich.ctx)).toHaveLength(1);
    expect(N04.evaluate(poor.ctx)).toEqual([]);
  });
});

describe('G12: стратегия исследований', () => {
  it('с кузницей и пользой — выбирается', () => {
    expect(STRATEGIES.G12(spearScene().ctx).score).toBeGreaterThan(0);
  });

  it('без пользы — не выбирается', () => {
    const { ctx } = spearScene({ researched: ['formation'], units: [] });

    expect(STRATEGIES.G12(ctx).score).toBe(0);
  });
});
