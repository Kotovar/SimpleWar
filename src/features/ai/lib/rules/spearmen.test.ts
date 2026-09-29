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
import { P01, P02, P03, P04, P05 } from './spearmen';

const map = grass(16, 16);

describe('P01: перехват конницы', () => {
  it('из двух соседей бьёт конницу, а не мечника', () => {
    const rider = foe('rider', 6, 5);
    const { ctx } = scene({
      map,
      units: [own('spearman', 5, 5)],
      enemies: [foe('swordsman', 4, 5), rider],
    });

    expect(P01.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: rider.id } },
    ]);
  });

  it('идёт на перехват конницы в досягаемости', () => {
    const rider = foe('rider', 10, 5);
    const spear = own('spearman', 5, 5);
    const { ctx } = scene({ map, units: [spear], enemies: [rider] });

    const [candidate] = P01.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), rider)).toBeLessThan(
      manhattan(spear, rider),
    );
  });

  it('не бросает строй ради далёкой конницы', () => {
    const { ctx } = scene({
      map,
      units: [own('spearman', 0, 0)],
      enemies: [foe('rider', 15, 15)],
    });

    expect(P01.evaluate(ctx)).toEqual([]);
  });
});

describe('P02: заслон от конницы', () => {
  it('встаёт рядом со стрелком, к которому идёт конница', () => {
    const archer = own('archer', 5, 5);
    const { ctx } = scene({
      map,
      units: [archer, own('spearman', 3, 7)],
      enemies: [foe('rider', 9, 5)],
    });

    const [candidate] = P02.evaluate(ctx);

    expect(manhattan(cellOf(candidate.action), archer)).toBeLessThanOrEqual(1);
  });

  it('без конницы заслон не нужен', () => {
    const { ctx } = scene({
      map,
      units: [own('archer', 5, 5), own('spearman', 3, 8)],
      enemies: [foe('swordsman', 9, 5)],
    });

    expect(P02.evaluate(ctx)).toEqual([]);
  });
});

describe('P03: удержание подхода', () => {
  it('копейщик гарнизона занимает пост в сторону угрозы', () => {
    const spear = own('spearman', 2, 2);
    const base = ownBuilding('base', 3, 3);
    const { ctx } = scene({
      map,
      units: [spear],
      buildings: [base],
      enemies: [foe('swordsman', 12, 3)],
      memory: { garrison: [spear.id] },
    });

    const [candidate] = P03.evaluate(ctx);
    const cell = cellOf(candidate.action);

    // Пост (5,3): в двух клетках от ратуши в сторону врага.
    expect(manhattan(cell, { x: 5, y: 3 })).toBeLessThan(
      manhattan(spear, { x: 5, y: 3 }),
    );
  });

  it('не преследует приманку вдали от поста: возвращается на пост', () => {
    const spear = own('spearman', 3, 9);
    const { ctx } = scene({
      map,
      units: [spear],
      buildings: [ownBuilding('base', 3, 3)],
      enemies: [foe('scout', 3, 10)],
      memory: { garrison: [spear.id] },
    });

    const [candidate] = P03.evaluate(ctx);

    expect(candidate.action.type).toBe('move');
    expect(cellOf(candidate.action).y).toBeLessThan(spear.y);
  });

  it('не в гарнизоне — пост не держит', () => {
    const { ctx } = scene({
      map,
      units: [own('spearman', 2, 2)],
      buildings: [ownBuilding('base', 3, 3)],
      enemies: [foe('swordsman', 12, 3)],
    });

    expect(P03.evaluate(ctx)).toEqual([]);
  });
});

describe('P04: копейщик в группе', () => {
  const operation = {
    phase: 'advance' as const,
    target: { x: 14, y: 5 },
    rally: null,
    since: 1,
  };

  it('идёт за передним мечником, не обгоняя его', () => {
    const spear = own('spearman', 1, 5);
    const { ctx } = scene({
      map,
      units: [spear, own('swordsman', 7, 5)],
      memory: { operation },
    });

    const [candidate] = P04.evaluate(ctx);
    const cell = cellOf(candidate.action);

    expect(cell.x).toBeGreaterThan(spear.x);
    expect(manhattan(cell, operation.target)).toBeGreaterThanOrEqual(7);
  });

  it('копейщик гарнизона с группой не уходит: защита базы важнее', () => {
    const spear = own('spearman', 1, 5);
    const { ctx } = scene({
      map,
      units: [spear, own('swordsman', 7, 5)],
      memory: { operation, garrison: [spear.id] },
    });

    expect(P04.evaluate(ctx)).toEqual([]);
  });
});

describe('P05: отход копейщика', () => {
  it('раненый отходит к безопасной клетке', () => {
    const spear = own('spearman', 5, 5, { hp: 20 });
    const { ctx } = scene({
      map,
      units: [spear],
      enemies: [foe('swordsman', 8, 5)],
    });

    const [candidate] = P05.evaluate(ctx);

    expect(ctx.threatAt(cellOf(candidate.action))).toBeLessThan(
      ctx.threatAt(spear),
    );
  });

  it('окружённый без безопасного выхода держит позицию', () => {
    const { ctx } = scene({
      map,
      units: [own('spearman', 5, 5)],
      enemies: [foe('swordsman', 6, 5), foe('swordsman', 5, 6)],
    });

    expect(P05.evaluate(ctx)).toEqual([]);
  });

  it('один враг рядом при полном HP — держится', () => {
    const { ctx } = scene({
      map,
      units: [own('spearman', 5, 5)],
      enemies: [foe('swordsman', 6, 5)],
    });

    expect(P05.evaluate(ctx)).toEqual([]);
  });
});
