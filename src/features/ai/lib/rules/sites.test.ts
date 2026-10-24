import { describe, expect, it } from 'vite-plus/test';
import {
  cellOf,
  foe,
  grass,
  own,
  ownBuilding,
  scene,
} from '../scene.test-utils';
import { decideStep } from '../decide';
import { R08, R09 } from './siteScouting';
import { R04 } from './scoutWatch';
import { M08 } from './outposts';
import { N05 } from './campRecruitment';
import { W05 } from './workers';

describe('R08: известные находки', () => {
  it.each(['cache', 'refugees', 'obelisk'] as const)(
    'идёт за %s по памяти, без содержимого',
    type => {
      const scout = own('scout', 1, 4);
      const { ctx } = scene({
        map: grass(12, 9),
        units: [scout],
        sites: [{ id: 'site', type, x: 8, y: 4 }],
        hidden: ['8,4'],
      });
      const [candidate] = R08.evaluate(ctx);
      expect(candidate.action).toMatchObject({
        type: 'move',
        unitId: scout.id,
        x: 6,
        y: 4,
      });
      expect(candidate.basis).toEqual({ site: type, x: 8, y: 4 });
    },
  );

  it('не выдумывает неизвестные находки', () => {
    expect(
      R08.evaluate(
        scene({ map: grass(12, 9), units: [own('scout', 1, 4)] }).ctx,
      ),
    ).toEqual([]);
  });

  it('беженцев без населения и руины оставляет', () => {
    const { ctx } = scene({
      map: grass(12, 9),
      units: [own('scout', 1, 4)],
      population: { max: 2, occupied: 2 },
      sites: [
        { id: 'ref', type: 'refugees', x: 4, y: 4 },
        { id: 'ruin', type: 'ruins', x: 5, y: 4 },
      ],
    });
    expect(R08.evaluate(ctx)).toEqual([]);
  });

  it('обходит опасность внутри маршрута и передаёт маску команде', () => {
    const { ctx } = scene({
      map: grass(16, 13),
      units: [own('scout', 1, 6)],
      enemies: [foe('archer', 7, 6)],
      sites: [{ id: 'cache', type: 'cache', x: 14, y: 6 }],
    });
    const [candidate] = R08.evaluate(ctx);
    expect(candidate.action.type).toBe('move');
    if (candidate.action.type !== 'move') throw new Error('ожидалось движение');
    expect(candidate.action.avoid?.[6 * 16 + 6]).toBe(1);
    expect(
      candidate.action.avoid?.[candidate.action.y * 16 + candidate.action.x],
    ).toBe(0);
    expect(cellOf(candidate.action).y).not.toBe(6);
  });

  it('не идёт за наградой в закрытый опасностью коридор', () => {
    const { ctx } = scene({
      map: ['...............'],
      units: [own('scout', 0, 0)],
      enemies: [foe('swordsman', 7, 0)],
      sites: [{ id: 'cache', type: 'cache', x: 14, y: 0 }],
    });
    expect(R08.evaluate(ctx)).toEqual([]);
  });

  it('прерывает задачу границы ради близкой находки', () => {
    const scout = own('scout', 1, 4);
    const { ctx } = scene({
      map: grass(12, 9),
      units: [scout],
      sites: [{ id: 'c', type: 'cache', x: 3, y: 4 }],
      memory: {
        tasks: [
          {
            id: 'task',
            kind: 'scout',
            ruleId: 'G05',
            unitId: scout.id,
            target: { x: 10, y: 1 },
            reserve: { gold: 0, wood: 0 },
            createdTurn: 1,
            reviewTurn: 10,
          },
        ],
      },
    });
    expect(R08.evaluate(ctx)).toHaveLength(1);
  });

  it('у лагеря стоит на месте, даже если найм сейчас невозможен', () => {
    const { ctx } = scene({
      map: grass(12, 9),
      units: [own('scout', 5, 4)],
      stock: { gold: 2000, wood: 2000 },
      sites: [{ id: 'camp', type: 'camp', x: 6, y: 4, hiresLeft: 3 }],
    });
    expect(R08.evaluate(ctx)).toEqual([]);
  });
});

describe('R09: костёр после разведки', () => {
  const setup = () =>
    scene({
      map: grass(16, 16),
      units: [own('scout', 7, 6)],
      buildings: [ownBuilding('base', 2, 2)],
      stock: { gold: 2000, wood: 2000 },
    });
  it('оставляет обзор у базы', () => {
    expect(R09.evaluate(setup().ctx)).toMatchObject([
      { action: { type: 'lightBeacon' } },
    ]);
  });
  it('до раскрытия карты не тратит дерево', () => {
    const { ctx } = setup();
    ctx.frontier.push({ x: 8, y: 8 });
    expect(R09.evaluate(ctx)).toEqual([]);
  });
  it('не дублирует свой или союзный костёр', () => {
    const { ctx } = setup();
    ctx.obs.alliedBuildings = [ownBuilding('beacon', 8, 7, { owner: 'p3' })];
    expect(R09.evaluate(ctx)).toEqual([]);
  });
  it('без боевого действия не разжигает', () => {
    const { ctx } = setup();
    const scout = ctx.military[0];
    scout.attackPoints = 0;
    expect(R09.evaluate(ctx)).toEqual([]);
  });
});

describe('R04: неподвижный наблюдатель', () => {
  it('ждёт в безопасности, а после ожидания больше не действует в этом ходу', () => {
    const scout = own('scout', 2, 5, { concealed: true });
    const { ctx } = scene({
      map: grass(16, 16),
      units: [scout],
      enemies: [foe('swordsman', 8, 5), foe('swordsman', 8, 6)],
    });
    expect(decideStep(ctx, [R04]).chosen?.action).toEqual({
      type: 'wait',
      actorId: scout.id,
    });
    ctx.turn.done.add(scout.id);
    expect(decideStep(ctx, [R04]).chosen).toBeNull();
  });

  it('не задерживает разведчика с задачей другого правила', () => {
    const scout = own('scout', 2, 5, { concealed: true });
    const { ctx } = scene({
      map: grass(16, 16),
      units: [scout],
      enemies: [foe('swordsman', 8, 5), foe('swordsman', 8, 6)],
      memory: {
        tasks: [
          {
            id: 'task',
            kind: 'scout',
            ruleId: 'G05',
            unitId: scout.id,
            target: { x: 14, y: 14 },
            reserve: { gold: 0, wood: 0 },
            createdTurn: 1,
            reviewTurn: 10,
          },
        ],
      },
    });
    expect(R04.evaluate(ctx)).toEqual([]);
  });
});

describe('M08: аванпосты', () => {
  it('боец ударной группы занимает соседние руины', () => {
    const unit = own('swordsman', 4, 4);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [unit],
      sites: [{ id: 'r', type: 'ruins', x: 5, y: 5 }],
    });
    expect(M08.evaluate(ctx)).toMatchObject([
      { action: { type: 'occupyRuins', unitId: unit.id, x: 5, y: 5 } },
    ]);
  });
  it('посылает бойца к ближайшим руинам', () => {
    const { ctx } = scene({
      map: grass(12, 12),
      units: [own('swordsman', 1, 1)],
      sites: [{ id: 'r', type: 'ruins', x: 7, y: 5 }],
    });
    expect(M08.evaluate(ctx)).toMatchObject([{ action: { type: 'move' } }]);
  });
  it('не захватывает руины без действия и не снимает гарнизон', () => {
    const unit = own('swordsman', 4, 4, { attackPoints: 0, movePoints: 3 });
    const { ctx } = scene({
      map: grass(12, 12),
      units: [unit],
      sites: [{ id: 'r', type: 'ruins', x: 5, y: 5 }],
    });
    expect(M08.evaluate(ctx)).toEqual([]);
    if (unit.role !== 'military') throw new Error('ожидался боец');
    unit.attackPoints = 1;
    ctx.memory.garrison = [unit.id];
    expect(M08.evaluate(ctx)).toEqual([]);
  });
  it('отправляет подкрепление защищать атакованный аванпост', () => {
    const { ctx } = scene({
      map: grass(20, 20),
      units: [own('swordsman', 1, 5)],
      buildings: [ownBuilding('outpost', 10, 5)],
      enemies: [foe('swordsman', 13, 5)],
    });
    expect(M08.evaluate(ctx)).toMatchObject([
      { reason: 'защищаю аванпост', action: { type: 'move' } },
    ]);
  });
});

describe('N05: выгодный найм', () => {
  const setup = (hiresLeft = 3) =>
    scene({
      map: grass(12, 12),
      units: [own('scout', 5, 5)],
      sites: [{ id: 'camp', type: 'camp', x: 6, y: 6, hiresLeft }],
      stock: { gold: 2000, wood: 2000 },
    });
  it('нанимает при отсутствии своего производства', () => {
    expect(N05.evaluate(setup().ctx)).toMatchObject([
      { action: { type: 'spawn', campId: 'camp', unitType: 'swordsman' } },
    ]);
  });
  it('не тратит золото на пустой лагерь', () => {
    expect(N05.evaluate(setup(0).ctx)).toEqual([]);
  });
  it('предпочитает доступный дешёвый найм в своих казармах', () => {
    const { ctx } = setup();
    ctx.obs.ownBuildings.push(ownBuilding('barracks', 3, 3));
    expect(N05.evaluate(ctx)).toEqual([]);
  });
  it('требует своего разведчика, население и реальную цену', () => {
    const { ctx } = setup();
    ctx.obs.population = { max: 2, occupied: 1 };
    expect(N05.evaluate(ctx)).toEqual([]);
    ctx.obs.population = { max: 20, occupied: 1 };
    ctx.budget.gold = 233;
    expect(N05.evaluate(ctx)).toEqual([]);
    ctx.budget.gold = 2000;
    ctx.military[0].x = 0;
    expect(N05.evaluate(ctx)).toEqual([]);
  });
});

it('W05 выбирает обнаруженную богатую жилу с учётом расстояния', () => {
  const { ctx } = scene({
    map: ['........', '........', '....gg..', '........', '........'],
    buildings: [ownBuilding('base', 1, 2)],
    units: [own('worker', 4, 1)],
    stock: { gold: 2000, wood: 2000 },
    knownRichGold: Array.from({ length: 5 }, (_, y) =>
      Array.from({ length: 8 }, (_, x) => x === 5 && y === 2),
    ),
  });
  // Богатая в 4 клетках выгоднее обычной в 3.
  expect(W05.evaluate(ctx)[0]).toMatchObject({
    action: { type: 'build', x: 5, y: 2 },
  });
  ctx.obs.knownRichGold![2][5] = false;
  expect(W05.evaluate(ctx)[0]).toMatchObject({
    action: { type: 'build', x: 4, y: 2 },
  });
});
