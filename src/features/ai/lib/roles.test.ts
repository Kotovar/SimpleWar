import { describe, expect, it } from 'vite-plus/test';
import { ownPower, roleWishes } from './composition';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';
import { W07 } from './rules/construction';
import { N02 } from './rules/production';
import { N03 } from './rules/recruitment';
import { C03 } from './rules/riders';
import { P02 } from './rules/spearmen';
import { T03, T04 } from './rules/towers';

const map = grass(12, 12);

describe('roleWishes: состав по известному врагу', () => {
  it('заменяет погибшего разведчика, пока известна лишь лесопилка врага', () => {
    const { ctx } = scene({
      map,
      buildings: [ownBuilding('base', 2, 2)],
      enemies: [foe('sawmill', 9, 9)],
    });
    expect(roleWishes(ctx).map(({ type }) => type)).toContain('scout');
  });

  it('видна конница — нужен копейщик', () => {
    const { ctx } = scene({ map, enemies: [foe('rider', 9, 9)] });

    expect(roleWishes(ctx)[0]).toMatchObject({
      type: 'spearman',
      producer: 'barracks',
    });
  });

  it('латник тоже конница — нужен копейщик', () => {
    const { ctx } = scene({ map, enemies: [foe('knight', 9, 9)] });

    expect(roleWishes(ctx)[0]).toMatchObject({ type: 'spearman' });
  });

  it('летающих больше, чем магов, — нужен и конный лучник', () => {
    const { ctx } = scene({
      map,
      units: [own('mage', 1, 1)],
      enemies: [foe('griffon', 9, 9), foe('griffon', 10, 9)],
    });

    expect(roleWishes(ctx)).toContainEqual(
      expect.objectContaining({ type: 'horseArcher', producer: 'stable' }),
    );
  });

  it('мечники врага без копейщиков — нужен латник', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2].map(i => own('swordsman', i, 1)),
      enemies: [foe('swordsman', 9, 9), foe('swordsman', 10, 9)],
    });

    expect(roleWishes(ctx)).toContainEqual(
      expect.objectContaining({ type: 'knight', producer: 'stable' }),
    );
  });

  it('у врага копейщики наравне с мечниками — латник не нужен', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2].map(i => own('swordsman', i, 1)),
      enemies: [
        foe('swordsman', 9, 9),
        foe('swordsman', 10, 9),
        foe('spearman', 9, 10),
        foe('spearman', 10, 10),
      ],
    });

    expect(roleWishes(ctx).map(({ type }) => type)).not.toContain('knight');
  });

  it('копейщик — один на двух конных врага', () => {
    const riders = [foe('rider', 9, 9), foe('rider', 10, 9)];
    const one = scene({ map, units: [own('spearman', 1, 1)], enemies: riders });
    const three = scene({
      map,
      units: [own('spearman', 1, 1)],
      enemies: [...riders, foe('knight', 9, 10)],
    });

    expect(roleWishes(one.ctx).map(({ type }) => type)).not.toContain(
      'spearman',
    );
    expect(roleWishes(three.ctx)[0]).toMatchObject({ type: 'spearman' });
  });

  it('у врага нет стрелков — грифон первым', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2, 3].map(i => own('swordsman', i, 1)),
      enemies: [foe('swordsman', 9, 9), foe('swordsman', 10, 9)],
    });

    expect(roleWishes(ctx)[0]).toMatchObject({
      type: 'griffon',
      producer: 'sanctuary',
    });
  });

  it('армия врага не разведана — грифона не просит', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2, 3].map(i => own('swordsman', i, 1)),
      enemies: [foe('swordsman', 9, 9)],
    });

    expect(roleWishes(ctx).map(({ type }) => type)).not.toContain('griffon');
  });

  it('у врага два стрелка — грифон не нужен', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2, 3].map(i => own('swordsman', i, 1)),
      enemies: [foe('archer', 9, 9), foe('mage', 10, 9)],
    });

    expect(roleWishes(ctx).map(({ type }) => type)).not.toContain('griffon');
  });

  it('у врага броня — маг пробивает её магией', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2].map(i => own('swordsman', i, 1)),
      enemies: [foe('spearman', 9, 9), foe('griffon', 10, 9)],
    });

    expect(roleWishes(ctx)).toContainEqual(
      expect.objectContaining({ type: 'mage', reason: 'у врага броня' }),
    );
  });

  it('медленная пехота врага — конный лучник', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2, 3].map(i => own('swordsman', i, 1)),
      enemies: [0, 1, 2].map(i => foe('swordsman', 9, 7 + i)),
    });

    expect(roleWishes(ctx)).toContainEqual(
      expect.objectContaining({ type: 'horseArcher', producer: 'stable' }),
    );
  });

  it('у врага стрелки — всадник для удара во фланг', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2].map(i => own('swordsman', i, 1)),
      enemies: [foe('archer', 9, 9), foe('mage', 10, 9)],
    });

    expect(roleWishes(ctx)).toContainEqual(
      expect.objectContaining({
        type: 'rider',
        reason: 'у врага стрелки и осада',
      }),
    );
  });

  it('конницы не видно — копейщик не нужен', () => {
    const { ctx } = scene({ map, enemies: [foe('swordsman', 9, 9)] });

    expect(roleWishes(ctx).map(({ type }) => type)).not.toContain('spearman');
  });

  it('скрытый состав не учитывается: без наблюдения нет пожеланий против него', () => {
    const { ctx } = scene({
      map,
      units: [own('scout', 1, 1)],
      enemies: [foe('tower', 9, 9)],
    });

    expect(roleWishes(ctx)).toEqual([]);
  });
});

describe('ownPower: сила против известного состава', () => {
  it('мечники против грифонов бессильны, лучники — нет', () => {
    const swords = scene({
      map,
      units: [own('swordsman', 1, 1)],
      enemies: [foe('griffon', 9, 9)],
    });
    const archers = scene({
      map,
      units: [own('archer', 1, 1)],
      enemies: [foe('griffon', 9, 9)],
    });

    expect(ownPower(swords.ctx)).toBe(0);
    expect(ownPower(archers.ctx)).toBeGreaterThan(0);
  });

  it('лекарь добавляет силу отряду', () => {
    const alone = scene({ map, units: [own('swordsman', 1, 1)] });
    const healed = scene({
      map,
      units: [own('swordsman', 1, 1), own('healer', 2, 1)],
    });

    expect(ownPower(healed.ctx)).toBeGreaterThan(ownPower(alone.ctx));
  });
});

describe('N03: найм новых ролей', () => {
  it('против конницы нанимает копейщика и при полной армии', () => {
    const { ctx } = scene({
      map,
      units: Array.from({ length: 10 }, (_, i) => own('swordsman', i, 0)),
      buildings: [ownBuilding('barracks', 5, 5)],
      enemies: [foe('rider', 10, 10)],
      stock: { gold: 2000, wood: 2000 },
      population: { max: 40, occupied: 20 },
    });

    expect(N03.evaluate(ctx)).toMatchObject([
      { action: { type: 'spawn', unitType: 'spearman' } },
    ]);
  });

  it('латника нанимает в конюшне', () => {
    const { ctx } = scene({
      map,
      units: [0, 1, 2].map(i => own('swordsman', i, 0)),
      buildings: [ownBuilding('stable', 5, 5)],
      enemies: [foe('swordsman', 10, 10), foe('swordsman', 11, 10)],
      stock: { gold: 2000, wood: 2000 },
      population: { max: 40, occupied: 6 },
      // К 20-му ходу желаемая армия — 6: трёх мечников мало.
      turn: 20,
    });

    expect(N03.evaluate(ctx)).toMatchObject([
      { action: { type: 'spawn', unitType: 'knight' } },
    ]);
  });

  it('нет здания найма — не нанимает', () => {
    const { ctx } = scene({
      map,
      buildings: [ownBuilding('base', 5, 5)],
      // База врага известна: разведчик из ратуши не нужен.
      enemies: [foe('rider', 10, 10), foe('base', 11, 11)],
      stock: { gold: 2000, wood: 2000 },
    });

    expect(N03.evaluate(ctx)).toEqual([]);
  });

  it('не хватает ресурсов — не нанимает', () => {
    const { ctx } = scene({
      map,
      buildings: [ownBuilding('barracks', 5, 5)],
      enemies: [foe('rider', 10, 10)],
      stock: { gold: 0, wood: 0 },
    });

    expect(N03.evaluate(ctx)).toEqual([]);
  });
});

describe('W07: здание найма для роли', () => {
  it('нужен маг против воздуха — строит святилище', () => {
    const { ctx } = scene({
      map,
      // Армия и рабочие в норме: копить не на что; золота мало на вторые казармы.
      units: [
        own('worker', 4, 4),
        own('worker', 0, 0),
        ...[0, 1, 2].map(i => own('swordsman', i, 11)),
      ],
      buildings: [ownBuilding('base', 5, 5), ownBuilding('barracks', 8, 8)],
      enemies: [foe('griffon', 11, 0)],
      stock: { gold: 240, wood: 1000 },
    });

    const [candidate] = W07.evaluate(ctx);

    expect(candidate.basis).toMatchObject({ building: 'sanctuary' });
  });
});

describe('T03: налёт на орудие', () => {
  it('башня бьёт видимое орудие раньше других', () => {
    const siege = foe('siege', 6, 5);
    const { ctx } = scene({
      map,
      buildings: [ownBuilding('tower', 5, 5), ownBuilding('farm', 4, 5)],
      enemies: [foe('swordsman', 5, 6), siege],
    });

    expect(T03.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: siege.id } },
    ]);
  });
});

describe('найм по долям: отказ и срочная оборона', () => {
  const core = () => [
    ...[0, 1, 2, 3].map(i => own('swordsman', i, 1)),
    ...[0, 1].map(i => own('archer', i, 2)),
  ];

  it('латнику не хватает населения — нанимает доступного мечника', () => {
    const { ctx } = scene({
      map,
      units: [
        ...core(),
        own('spearman', 0, 3),
        own('rider', 1, 3),
        own('horseArcher', 2, 3),
      ],
      buildings: [ownBuilding('barracks', 5, 5), ownBuilding('stable', 8, 8)],
      stock: { gold: 2000, wood: 2000 },
      population: { max: 30, occupied: 27 },
      turn: 40,
    });

    expect(N02.evaluate(ctx)).toMatchObject([
      { action: { type: 'spawn', unitType: 'swordsman' } },
    ]);
  });

  it('грифону не хватает населения — не ждёт его, а нанимает другого', () => {
    const { ctx } = scene({
      map,
      units: [
        own('worker', 1, 8),
        own('worker', 1, 9),
        ...[0, 1, 2].map(i => own('swordsman', i, 1)),
        own('archer', 0, 2),
        own('healer', 2, 3),
      ],
      buildings: [
        ownBuilding('base', 2, 8),
        ownBuilding('sanctuary', 8, 8),
        ownBuilding('barracks', 5, 5),
      ],
      // Стрелков у врага нет: нужен грифон, до него копить пару ходов
      // (доход ратуши есть).
      enemies: [foe('swordsman', 11, 0), foe('swordsman', 10, 0)],
      stock: { gold: 290, wood: 200 },
      population: { max: 30, occupied: 28 },
      turn: 24,
    });

    const hired = N02.evaluate(ctx);

    expect(hired).toHaveLength(1);
    expect(hired[0].action).not.toMatchObject({ unitType: 'griffon' });
  });

  it('при срочной обороне берёт мечника, а не лекаря из святилища', () => {
    const { ctx } = scene({
      map,
      units: [...core(), own('spearman', 0, 3), own('mage', 1, 3)],
      buildings: [
        ownBuilding('sanctuary', 8, 8),
        ownBuilding('barracks', 5, 5),
      ],
      stock: { gold: 300, wood: 200 },
      population: { max: 40, occupied: 16 },
      memory: { strategy: 'G01' },
    });

    expect(N02.evaluate(ctx)).toMatchObject([
      { action: { type: 'spawn', unitType: 'swordsman' } },
    ]);
  });
});

describe('W07 и накопление: один порядок', () => {
  it('конюшня для роли строится сразу, резерв кузницы её не держит', () => {
    const { ctx } = scene({
      map,
      // Ударная группа собрана (кузница нужна), лекарь уже есть.
      units: [
        own('worker', 4, 4),
        own('scout', 0, 0),
        own('healer', 4, 11),
        ...[0, 1, 2].map(i => own('swordsman', i, 11)),
      ],
      buildings: [ownBuilding('base', 5, 5), ownBuilding('barracks', 8, 8)],
      // Видны рабочий и два лучника врага: нужен всадник, грифон — нет.
      // Дальше радиуса тревоги + 2: башня не нужна.
      enemies: [
        foe('worker', 11, 0),
        foe('archer', 11, 1),
        foe('archer', 10, 0),
      ],
      // Сверх резерва на рабочего (40/40) хватает и на конюшню (120/160),
      // и на кузницу (100/150), но не на обе.
      stock: { gold: 170, wood: 200 },
      turn: 40,
    });

    expect(W07.evaluate(ctx)[0]?.basis).toMatchObject({ building: 'stable' });
  });
});

describe('конный лучник в защитных правилах', () => {
  it('T04: башня прикрывает своего конного лучника', () => {
    const spear = foe('spearman', 8, 5);
    const { ctx } = scene({
      map,
      units: [own('horseArcher', 8, 6)],
      buildings: [ownBuilding('tower', 5, 5)],
      enemies: [spear],
    });

    expect(T04.evaluate(ctx)).toMatchObject([
      { action: { type: 'attack', targetId: spear.id } },
    ]);
  });

  it('P02: угрозу считает по дальности выстрела, а не вплотную', () => {
    // 5 клеток хода + 2 выстрела: до лучника ровно 7.
    const { ctx } = scene({
      map,
      units: [own('spearman', 2, 2), own('archer', 5, 5)],
      enemies: [foe('horseArcher', 11, 6)],
    });

    expect(P02.evaluate(ctx)).toMatchObject([{ ruleId: 'P02' }]);
  });

  it('C03: налёт конного лучника на рабочего перехватывается', () => {
    const { ctx } = scene({
      map,
      units: [own('rider', 7, 9), own('worker', 4, 8)],
      enemies: [foe('horseArcher', 10, 9)],
    });

    expect(C03.evaluate(ctx)).toMatchObject([{ ruleId: 'C03' }]);
  });
});

describe('отметка удара в контексте', () => {
  it('клетка под отметкой опасна для земли, не для воздуха', () => {
    const { ctx } = scene({ map, strikes: [{ x: 3, y: 3 }] });

    expect(ctx.threatAt({ x: 3, y: 3 })).toBeGreaterThan(0);
    expect(ctx.threatAt({ x: 3, y: 3 }, 'griffon')).toBe(0);
    expect(ctx.threatAt({ x: 4, y: 3 })).toBe(0);
  });
});
