import { describe, expect, it } from 'vite-plus/test';
import { decideStep } from './decide';
import { nextRecruit } from './facts';
import { planOperation } from './operation';
import { STRATEGIES } from './strategy';
import {
  cellOf,
  foe,
  grass,
  own,
  ownBuilding,
  scene,
} from './scene.test-utils';
import { F01, F03 } from './rules/griffons';
import { M01, M02 } from './rules/soldiers';
import { A05 } from './rules/archers';
import { H02 } from './rules/healers';
import { O05 } from './rules/siege';
import { P01, P03 } from './rules/spearmen';

/** Сценарии из ревью S15: конкуренция правил и оценки после команды. */

const map = grass(16, 16);
const advance = (target = { x: 15, y: 5 }) => ({
  phase: 'advance' as const,
  target,
  rally: null,
  since: 1,
});

describe('X02 против атаки', () => {
  it('раненый маг на отметке уходит, а не стреляет, даже при G08', () => {
    const mage = own('mage', 5, 5, { hp: 8 });
    const { ctx } = scene({
      map,
      units: [mage],
      enemies: [foe('worker', 7, 5)],
      strikes: [{ x: 5, y: 5 }],
      memory: { strategy: 'G08' },
    });

    const { chosen } = decideStep(ctx);

    expect(chosen).toMatchObject({ ruleId: 'X02', actorId: mage.id });
  });
});

describe('S21: разведка и рейд конкурируют за первый шаг', () => {
  it('G05 отдаёт приоритет поиску, G09 — доступному рейду по рабочему', () => {
    const spec = {
      map: Array.from({ length: 12 }, () => '.......?????'),
      units: [own('scout', 5, 5), own('rider', 1, 1)],
      enemies: [foe('worker', 3, 1)],
    };
    const search = decideStep(
      scene({ ...spec, memory: { strategy: 'G05' } }).ctx,
    );
    const raid = decideStep(
      scene({ ...spec, memory: { strategy: 'G09' } }).ctx,
    );
    expect(search.chosen?.ruleId).toBe('R01');
    expect(raid.chosen?.ruleId).toBe('C01');
  });
});

describe('оценка сил против непоражаемого врага', () => {
  it.each([
    [M01, 'swordsman'],
    [M02, 'swordsman'],
    [A05, 'archer'],
    [F03, 'griffon'],
  ] as const)(
    '%s: слабая приманка у базы не отзывает наступающего бойца за гарнизон',
    (rule, type) => {
      const unit = own(type, 20, 20);
      const guards = [own('swordsman', 3, 2), own('swordsman', 2, 3)];
      const { ctx } = scene({
        map: grass(30, 30),
        units: [unit, ...guards, own('worker', 4, 2)],
        buildings: [ownBuilding('base', 2, 2)],
        enemies: [foe('scout', 5, 2, { hp: 5 })],
        memory: {
          operation: advance({ x: 28, y: 28 }),
          garrison: guards.map(u => u.id),
        },
      });
      expect(planOperation(ctx).operation.phase).toBe('advance');
      expect(rule.evaluate(ctx).filter(c => c.actorId === unit.id)).toEqual([]);
      ctx.memory.operation.phase = 'retreat';
      expect(rule.evaluate(ctx).some(c => c.actorId === unit.id)).toBe(true);
    },
  );
  it('G11: мечники против грифона проигрывают бой', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2, 3].map(i => own('swordsman', 5 + i, 5)),
      enemies: [foe('griffon', 7, 7)],
      memory: { operation: advance() },
    });

    expect(STRATEGIES.G11(ctx).score).toBeGreaterThan(0);
  });

  it('гарнизон мечников против грифона у базы — не защита: отход', () => {
    const swords = [own('swordsman', 3, 4), own('swordsman', 4, 3)];
    const { ctx } = scene({
      map,
      units: [...swords, own('swordsman', 12, 5)],
      buildings: [ownBuilding('base', 3, 3)],
      enemies: [foe('griffon', 5, 5)],
      memory: {
        operation: advance(),
        garrison: swords.map(({ id }) => id),
      },
    });

    expect(planOperation(ctx).operation.phase).toBe('retreat');
  });
});

describe('H02: остановка хода', () => {
  it('не останавливается под ближним ударом по пути к раненому', () => {
    const { ctx } = scene({
      map,
      units: [own('healer', 4, 5), own('swordsman', 12, 5, { hp: 50 })],
      enemies: [foe('swordsman', 6, 8)],
    });

    expect(H02.evaluate(ctx)).toEqual([]);
  });
});

describe('F01: воздушная позиция атаки', () => {
  it('летит к базе врага на острове: встаёт над водой', () => {
    const island = Array.from({ length: 11 }, (_, y) =>
      y >= 3 && y <= 7 ? '.....wwwww.' : '...........',
    );
    const griffon = own('griffon', 1, 5);
    const { ctx } = scene({
      map: island,
      units: [griffon, own('swordsman', 0, 5)],
      enemies: [foe('base', 7, 5)],
      memory: { operation: advance({ x: 7, y: 5 }) },
    });

    const [candidate] = F01.evaluate(ctx);

    expect(cellOf(candidate.action).x).toBeGreaterThan(griffon.x);
  });
});

describe('копейщик гарнизона', () => {
  it('P03: стоя на посту, пост не меняет', () => {
    const spear = own('spearman', 5, 3);
    const { ctx } = scene({
      map,
      units: [spear],
      buildings: [ownBuilding('base', 3, 3)],
      enemies: [foe('swordsman', 12, 3)],
      memory: { garrison: [spear.id] },
    });

    expect(P03.evaluate(ctx)).toEqual([]);
  });

  it('P01: всадник-приманка вдали от базы гарнизон не уводит', () => {
    const spear = own('spearman', 5, 3);
    const { ctx } = scene({
      map,
      units: [spear],
      buildings: [ownBuilding('base', 3, 3)],
      enemies: [foe('rider', 11, 3)],
      memory: { garrison: [spear.id] },
    });

    expect(P01.evaluate(ctx)).toEqual([]);
  });

  it('P01: всадник у базы — гарнизон перехватывает', () => {
    const spear = own('spearman', 5, 3);
    const { ctx } = scene({
      map,
      units: [spear],
      buildings: [ownBuilding('base', 3, 3)],
      enemies: [foe('rider', 8, 3)],
      memory: { garrison: [spear.id] },
    });

    expect(P01.evaluate(ctx)).toMatchObject([{ ruleId: 'P01' }]);
  });
});

describe('nextRecruit: новые роли не считаются лучниками', () => {
  it('мечник и разведчик без лучников — нужен лучник', () => {
    const { ctx } = scene({
      map,
      units: [own('swordsman', 1, 1), own('scout', 2, 1)],
    });

    expect(nextRecruit(ctx)).toBe('archer');
  });
});

describe('O05: защитный удар', () => {
  it('по грифону не готовит: удар воздух не задевает', () => {
    const box = ['.......', '.^^^...', '.^.^...', '.^^^...', '.......'];
    const { ctx } = scene({
      map: box,
      units: [own('siege', 2, 2)],
      enemies: [foe('griffon', 5, 2)],
    });

    expect(O05.evaluate(ctx)).toEqual([]);
  });
});
