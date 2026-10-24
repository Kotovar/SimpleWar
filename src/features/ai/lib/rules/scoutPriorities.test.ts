import { describe, expect, it } from 'vite-plus/test';
import { decideStep } from '../decide';
import { foe, grass, own, ownBuilding, scene } from '../scene.test-utils';
import { N05 } from './campRecruitment';
import { M08 } from './outposts';
import { R04, R06 } from './scoutWatch';
import { R08, R09 } from './siteScouting';

it('сбор далёкой безопасной находки важнее неподвижного наблюдения', () => {
  const { ctx } = scene({
    map: grass(32, 16),
    units: [own('scout', 2, 5)],
    enemies: [foe('swordsman', 8, 5), foe('swordsman', 8, 6)],
    sites: [{ id: 'cache', type: 'cache', x: 29, y: 5 }],
  });
  expect(R04.evaluate(ctx)[0].action.type).toBe('wait');
  expect(decideStep(ctx, [R04, R08]).chosen?.ruleId).toBe('R08');
});

it('сбор находки не мешает скрыться, когда отступление не снижает угрозу', () => {
  const { ctx } = scene({
    map: grass(12, 10),
    units: [own('scout', 1, 1, { movePoints: 1 })],
    enemies: [foe('swordsman', 3, 1)],
    sites: [{ id: 'cache', type: 'cache', x: 1, y: 6 }],
    memory: { strategy: 'G05' },
  });
  expect(R06.evaluate(ctx)[0].action.type).toBe('wait');
  expect(decideStep(ctx, [R06, R08]).chosen?.ruleId).toBe('R06');
});

describe('разведчик занимает руины', () => {
  it.each([4, 1])('занимает или подходит с x=%i', x => {
    const scout = own('scout', x, 4);
    const { ctx } = scene({
      map: grass(12, 12),
      units: [scout],
      sites: [{ id: 'ruins', type: 'ruins', x: 5, y: 5 }],
    });
    expect(M08.evaluate(ctx)).toMatchObject([
      { action: { type: x === 4 ? 'occupyRuins' : 'move', unitId: scout.id } },
    ]);
  });

  it('не прокладывает маршрут через опасность ради руин', () => {
    const { ctx } = scene({
      map: ['...............'],
      units: [own('scout', 0, 0)],
      enemies: [foe('swordsman', 7, 0)],
      sites: [{ id: 'ruins', type: 'ruins', x: 14, y: 0 }],
    });
    expect(M08.evaluate(ctx)).toEqual([]);
  });
});

describe('костёр у богатой жилы до полного исследования карты', () => {
  const setup = () => {
    const map = grass(20, 12);
    map[0] = '?' + '.'.repeat(19);
    map[5] = '.'.repeat(12) + 'g' + '.'.repeat(7);
    return scene({
      map,
      units: [own('scout', 11, 5), own('worker', 8, 5)],
      buildings: [ownBuilding('base', 1, 1)],
      stock: { gold: 2000, wood: 2000 },
      knownRichGold: Array.from({ length: 12 }, (_, y) =>
        Array.from({ length: 20 }, (_, x) => x === 12 && y === 5),
      ),
    });
  };

  it('оставляет обзор жилы для рабочего', () => {
    const { ctx } = setup();
    expect(ctx.frontier.length).toBeGreaterThan(0);
    const [candidate] = R09.evaluate(ctx);
    expect(candidate?.action.type).toBe('lightBeacon');
    if (candidate?.action.type !== 'lightBeacon') return;
    expect(
      Math.abs(candidate.action.x - 12) + Math.abs(candidate.action.y - 5),
    ).toBeLessThanOrEqual(5);
  });

  it('не дублирует постоянный или союзный обзор жилы', () => {
    const { ctx } = setup();
    ctx.obs.alliedBuildings = [ownBuilding('outpost', 14, 5, { owner: 'p3' })];
    expect(R09.evaluate(ctx)).toEqual([]);
  });

  it('не тратится на ещё не раскрытое богатство', () => {
    const { ctx } = setup();
    ctx.obs.knownRichGold![5][12] = false;
    expect(R09.evaluate(ctx)).toEqual([]);
  });

  it('не тратится, если рабочий не успеет до угасания', () => {
    const { ctx } = setup();
    ctx.workers[0].maxMovePoints = 0;
    expect(R09.evaluate(ctx)).toEqual([]);
  });

  it('не занимает площадку обещанной стройки', () => {
    const { ctx } = setup();
    const [candidate] = R09.evaluate(ctx);
    expect(candidate?.action.type).toBe('lightBeacon');
    if (candidate?.action.type !== 'lightBeacon') return;
    ctx.memory.tasks.push({
      id: 'build',
      kind: 'build',
      ruleId: 'W07',
      unitId: ctx.workers[0].id,
      buildingType: 'farm',
      target: candidate.action,
      reserve: { gold: 0, wood: 0 },
      createdTurn: 1,
      reviewTurn: 10,
    });
    const next = R09.evaluate(ctx)[0];
    expect(next?.action).not.toEqual(candidate.action);
  });
});

describe('скрытность при невозможности отступить', () => {
  const setup = (strikes: { x: number; y: number }[] = []) =>
    scene({
      map: ['wwwww', 'wwwww', 'ww.w.', 'wwwww', 'wwwww'],
      units: [own('scout', 2, 2)],
      enemies: [foe('archer', 4, 2)],
      strikes,
    });

  it.each([0, 5])('ждёт ради маскировки при %i очках движения', points => {
    const { ctx } = setup();
    ctx.military[0].movePoints = points;
    expect(ctx.threatAt(ctx.military[0], 'scout')).toBeGreaterThan(0);
    expect(R06.evaluate(ctx)).toMatchObject([{ action: { type: 'wait' } }]);
  });

  it('не рассчитывает спрятаться после движения в этом ходу', () => {
    const { ctx } = setup();
    ctx.military[0].scoutActed = true;
    expect(R06.evaluate(ctx)).toEqual([]);
  });

  it('не рассчитывает на маскировку вплотную к врагу', () => {
    const { ctx } = scene({
      map: ['wwwww', 'wwwww', 'ww..w', 'wwwww', 'wwwww'],
      units: [own('scout', 2, 2)],
      enemies: [foe('swordsman', 3, 2)],
    });
    expect(R06.evaluate(ctx)).toEqual([]);
  });

  it('не прячется от публичного удара по клетке', () => {
    const { ctx } = setup([{ x: 2, y: 2 }]);
    expect(R06.evaluate(ctx)).toEqual([]);
  });
});

it('найм лагеря выбирает доступного наёмника при наличии конюшни', () => {
  const { ctx } = scene({
    map: grass(16, 12),
    units: [own('scout', 10, 5)],
    buildings: [ownBuilding('stable', 1, 1)],
    sites: [{ id: 'camp', type: 'camp', x: 11, y: 5, hiresLeft: 3 }],
    stock: { gold: 2000, wood: 2000 },
  });
  expect(N05.evaluate(ctx)).toMatchObject([
    { action: { type: 'spawn', campId: 'camp', unitType: 'swordsman' } },
  ]);
});
