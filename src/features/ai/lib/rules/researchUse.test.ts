import { describe, expect, it } from 'vite-plus/test';
import { FORMATION_ARMOR } from '@shared/config';
import {
  cellOf,
  foe,
  grass,
  own,
  ownBuilding,
  scene,
} from '../scene.test-utils';
import { battleRatio } from '../composition';
import { manhattan } from '../geometry';
import { damageTo } from './common';
import { W06 } from './farms';
import { O07 } from './hiddenAiming';
import { P06, W11 } from './researchUse';
import { R04 } from './scoutWatch';

describe('Строй', () => {
  const units = () => [own('spearman', 2, 2), own('spearman', 5, 2)];

  it('P06: после изучения копейщик встаёт рядом с другим', () => {
    const before = scene({ map: grass(8, 8), units: units() });
    const after = scene({
      map: grass(8, 8),
      units: units(),
      researched: ['formation'],
    });

    expect(P06.evaluate(before.ctx)).toEqual([]);
    const moves = P06.evaluate(after.ctx);
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      const mate = after.obs.ownUnits.find(({ id }) => id !== move.actorId)!;
      expect(manhattan(cellOf(move.action), mate)).toBe(1);
    }
  });

  it('P06 не уводит копейщика под удар ради Строя', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [own('spearman', 8, 5), own('spearman', 5, 5)],
      enemies: [foe('swordsman', 4, 7)],
      researched: ['formation'],
    });

    for (const move of P06.evaluate(ctx)) {
      const unit = ctx.military.find(({ id }) => id === move.actorId)!;
      expect(ctx.threatAt(cellOf(move.action), 'spearman')).toBeLessThanOrEqual(
        ctx.threatAt(unit, 'spearman'),
      );
    }
  });

  it('видимый бонус Строя врага снижает расчётный урон', () => {
    const plain = foe('spearman', 3, 3);
    const armored = { ...plain, armorBonus: FORMATION_ARMOR };
    const { ctx } = scene({ map: grass(6, 6), enemies: [plain, armored] });
    const sword = { type: 'swordsman' as const, attack: 12 };

    expect(
      damageTo(sword, ctx.enemies[0]) - damageTo(sword, ctx.enemies[1]),
    ).toBe(FORMATION_ARMOR);
  });

  it('свой Строй улучшает соотношение сил в бою', () => {
    const pair = [own('spearman', 2, 2), own('spearman', 3, 2)];
    const spec = {
      map: grass(8, 8),
      units: pair,
      enemies: [foe('swordsman', 2, 4), foe('swordsman', 3, 4)],
    };
    const before = scene(spec);
    const after = scene({ ...spec, researched: ['formation'] });

    expect(battleRatio(after.ctx, after.ctx.military)).toBeGreaterThan(
      battleRatio(before.ctx, before.ctx.military),
    );
  });
});

describe('Инженерия: W11', () => {
  // Хребет с двумя щелями: x = 4 у базы и x = 9 в стороне. Перекрыть
  // одну можно — вторая остаётся последним выходом.
  const map = [
    '..........',
    '..........',
    '..........',
    '..........',
    '^^^^.^^^^.',
    ...grass(10, 9),
  ];
  const spec = {
    map,
    units: [own('worker', 2, 1)],
    buildings: [ownBuilding('base', 4, 1)],
    contacts: [],
    enemies: [foe('swordsman', 4, 12)],
  };

  it('после изучения ставит частокол в узком проходе к базе', () => {
    const before = scene(spec);
    const after = scene({ ...spec, researched: ['engineering'] });

    expect(W11.evaluate(before.ctx)).toEqual([]);
    const [candidate] = W11.evaluate(after.ctx);
    expect(candidate).toMatchObject({
      ruleId: 'W11',
      task: { buildingType: 'palisade' },
    });
    expect(candidate.task?.target).toEqual({ x: 4, y: 4 });
  });
});

describe('Скрытая наводка: O07', () => {
  const spec = {
    map: grass(10, 10),
    units: [own('siege', 1, 1), own('swordsman', 1, 2)],
    enemies: [foe('swordsman', 4, 1), foe('archer', 5, 1)],
  };

  it('после изучения готовит удар по скоплению', () => {
    expect(O07.evaluate(scene(spec).ctx)).toEqual([]);
    expect(
      O07.evaluate(scene({ ...spec, researched: ['hiddenAiming'] }).ctx),
    ).toMatchObject([{ action: { type: 'prepareStrike' } }]);
  });

  it('вражеский разведчик рядом с целью — удара нет', () => {
    const { ctx } = scene({
      ...spec,
      enemies: [...spec.enemies, foe('scout', 6, 3)],
      researched: ['hiddenAiming'],
    });

    expect(O07.evaluate(ctx)).toEqual([]);
  });
});

describe('Картография: R04', () => {
  it('после изучения разведчик следит и за одиночным врагом', () => {
    const spec = {
      map: grass(12, 12),
      units: [own('scout', 1, 1)],
      enemies: [foe('swordsman', 9, 9)],
    };

    expect(R04.evaluate(scene(spec).ctx)).toEqual([]);
    expect(
      R04.evaluate(scene({ ...spec, researched: ['cartography'] }).ctx),
    ).toMatchObject([{ ruleId: 'R04', action: { type: 'move' } }]);
  });
});

describe('Артель', () => {
  it('ферму строит рабочий с добычи, не снимаясь с работы', () => {
    const mine = ownBuilding('mine', 7, 7);
    const miner = own('worker', 7, 7, { workplaceId: mine.id });
    const spec = {
      map: grass(10, 10),
      units: [miner],
      buildings: [ownBuilding('base', 1, 1), mine],
      population: { max: 10, occupied: 10 },
    };

    expect(W06.evaluate(scene(spec).ctx)).toMatchObject([
      { action: { type: 'unassign' } },
    ]);
    const [build] = W06.evaluate(scene({ ...spec, researched: ['artel'] }).ctx);
    expect(build).toMatchObject({
      actorId: miner.id,
      action: { type: 'build' },
    });
    expect(
      Math.max(
        Math.abs(cellOf(build.action).x - mine.x),
        Math.abs(cellOf(build.action).y - mine.y),
      ),
    ).toBe(1);
  });
});
