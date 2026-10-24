import { describe, expect, it } from 'vite-plus/test';
import type { Building, Unit } from '@shared/config';
import { createUnit } from '@entities/units';
import { createBuilding } from '@entities/buildings';
import { diffScene, type DiffContext, type Tracked } from './diffScene';
import { getEventSfx, isInCombat } from './sceneFeedback';
import { getDetailLevel } from './drawEntityStatus';

const unit = (type: Unit['type'], x: number, owner: 'p1' | 'p2', patch = {}) =>
  ({ ...createUnit(type, x, 0, owner, false)!, ...patch }) as Unit;

const context = (patch: Partial<DiffContext> = {}): DiffContext => ({
  firstRun: false,
  knownIds: new Set(),
  worldIds: new Set(),
  isVisible: () => true,
  humanId: 'p1',
  ...patch,
});

/** Прошлый кадр с теми же объектами. */
const before = (...entities: (Unit | Building)[]) =>
  diffScene(new Map(), entities, context({ firstRun: true })).tracked;

const kinds = (events: { kind: string }[]) => events.map(event => event.kind);

describe('diffScene', () => {
  it('маскировка и гибель между двумя кадрами не выдают скрытого врага звуком или эффектом', () => {
    const scout = unit('scout', 4, 'p2');
    expect(
      diffScene(
        before(scout),
        [],
        context({
          deathCell: () => ({ x: 4, y: 0, hidden: true }),
        }),
      ).events,
    ).toEqual([]);
  });
  it('новый объект мира — найм или стройка, вышедший из тумана враг — угроза', () => {
    const recruit = unit('archer', 1, 'p1');
    const tower = createBuilding('tower', 2, 0, 'p1')!;
    const enemy = unit('swordsman', 5, 'p2');
    const worker = unit('worker', 6, 'p2');

    const { events } = diffScene(new Map(), [recruit, tower, enemy, worker], {
      ...context(),
      knownIds: new Set([enemy.id, worker.id]),
    });

    expect(events).toEqual([
      expect.objectContaining({
        kind: 'spawn',
        id: recruit.id,
        building: false,
      }),
      expect.objectContaining({ kind: 'spawn', id: tower.id, building: true }),
      { kind: 'threat', x: 5, y: 0 },
    ]);
    expect(events.map(getEventSfx)).toEqual(['spawn', 'build', 'threat']);
  });

  it('первый кадр ничего не объявляет', () => {
    const { events } = diffScene(new Map(), [unit('archer', 1, 'p2')], {
      ...context({ firstRun: true }),
    });
    expect(events).toEqual([]);
  });

  it('уход в туман — не гибель, исчезновение в обзоре — гибель', () => {
    const gone = unit('archer', 1, 'p2');
    const hidden = unit('archer', 4, 'p2');
    const previous = before(gone, hidden);

    const { events } = diffScene(previous, [], {
      ...context(),
      worldIds: new Set([hidden.id]),
    });
    expect(events).toEqual([
      {
        kind: 'death',
        id: gone.id,
        x: 1,
        y: 0,
        hp: gone.hp,
        building: false,
        type: 'archer',
        owner: 'p2',
      },
    ]);
    expect(events.map(getEventSfx)).toEqual(['death']);

    // Убит вне обзора — тишина.
    expect(
      diffScene(previous, [], context({ isVisible: () => false })).events,
    ).toEqual([]);
  });

  it('трата очка атаки видимым бойцом — удар с ближайшей видимой целью', () => {
    const mage = unit('mage', 0, 'p1', { attackPoints: 1 });
    const target = unit('swordsman', 2, 'p2');
    const previous = before(mage, target);

    const { events } = diffScene(
      previous,
      [{ ...mage, attackPoints: 0 } as Unit, { ...target, hp: target.hp - 10 }],
      context({ strikeCells: new Set(['9,9']) }),
    );

    expect(events).toEqual([
      {
        kind: 'damage',
        id: target.id,
        x: 2,
        y: 0,
        amount: 10,
        building: false,
        strike: false,
      },
      { kind: 'attack', id: mage.id, type: 'mage', target: { x: 2, y: 0 } },
    ]);
    expect(events.map(getEventSfx)).toEqual(['hitUnit', 'magic']);
  });

  it('скрытый стрелок не даёт удара: видно только попадание', () => {
    const target = unit('swordsman', 2, 'p1');
    const { events } = diffScene(
      before(target),
      [{ ...target, hp: target.hp - 5 }],
      context(),
    );
    expect(kinds(events)).toEqual(['damage']);
  });

  it('подготовка удара слышна, только если отметка видна смотрящему', () => {
    const siege = unit('siege', 0, 'p2', { attackPoints: 1 });
    const prepared = {
      ...siege,
      attackPoints: 0,
      preparedStrike: { x: 3, y: 0 },
    } as Unit;

    const seen = diffScene(before(siege), [prepared], {
      ...context(),
      visibleStrikes: new Set(['3,0']),
    });
    expect(seen.events.map(getEventSfx)).toEqual(['strikePrepare']);

    // Скрытая наводка: орудие видно, отметка нет — тишина.
    const hidden = diffScene(before(siege), [prepared], context());
    expect(hidden.events).toEqual([]);
  });

  it('удар осады — попадание по исчезнувшей отметке, а не по ещё ждущей', () => {
    const house = createBuilding('farm', 3, 0, 'p1')!;
    const hit = [{ ...house, hp: house.hp - 30 }];
    const marks = new Set(['3,0']);

    const executed = diffScene(before(house), hit, {
      ...context(),
      strikeCells: marks,
      visibleStrikes: new Set(),
    });
    expect(executed.events.map(getEventSfx)).toEqual(['strike']);

    // Обычная атака по клетке с отметкой до исполнения.
    const regular = diffScene(before(house), hit, {
      ...context(),
      strikeCells: marks,
      visibleStrikes: marks,
    });
    expect(regular.events.map(getEventSfx)).toEqual(['hitBuilding']);
  });

  it('разрушение здания звучит иначе, чем гибель юнита', () => {
    const farm = createBuilding('farm', 1, 0, 'p2')!;
    const { events } = diffScene(before(farm), [], context());
    expect(events.map(getEventSfx)).toEqual(['destroy']);
  });

  it('ушёл в туман и погиб там — гибель не видна', () => {
    const enemy = unit('archer', 1, 'p2');
    const { events } = diffScene(before(enemy), [], {
      ...context({ isVisible: x => x < 3 }),
      deathCell: () => ({ x: 5, y: 0 }),
    });
    expect(events).toEqual([]);
  });

  it('свой погиб и клетка ушла в туман — гибель видна', () => {
    const own = unit('archer', 1, 'p1');
    const { events } = diffScene(
      before(own),
      [],
      context({ isVisible: () => false }),
    );
    expect(kinds(events)).toEqual(['death']);
  });

  it('новый ход восстанавливает очки — это не удар', () => {
    const archer = unit('archer', 0, 'p1', { attackPoints: 0 });
    const { events } = diffScene(
      before(archer),
      [{ ...archer, attackPoints: 1 } as Unit],
      context(),
    );
    expect(events).toEqual([]);
  });

  it('перемещение и лечение', () => {
    const archer = unit('archer', 0, 'p1', { hp: 10 });
    const previous: Map<string, Tracked> = new Map(before(archer));
    const { events } = diffScene(
      previous,
      [{ ...archer, x: 1, hp: 20 }],
      context(),
    );
    expect(events.map(getEventSfx)).toEqual(['move', 'heal']);
  });
});

describe('isInCombat', () => {
  it('музыка боя — только по видимому военному врагу рядом', () => {
    const own = unit('worker', 0, 'p1');
    const near = unit('archer', 3, 'p2');
    const far = unit('archer', 40, 'p2');
    const worker = unit('worker', 1, 'p2');

    expect(isInCombat([own, near], [], 'p1')).toBe(true);
    expect(isInCombat([own, far, worker], [], 'p1')).toBe(false);
    expect(isInCombat([own, near], [], null)).toBe(false);
  });
});

describe('getDetailLevel', () => {
  it('значки издалека, силуэты на среднем, детали вблизи', () => {
    expect([6, 13, 14, 21, 22, 64].map(getDetailLevel)).toEqual([
      'icon',
      'icon',
      'silhouette',
      'silhouette',
      'detail',
      'detail',
    ]);
  });
});

describe('getEventSfx по типу', () => {
  it('у лучника, башни и грифона свои звуки удара, у грифона — гибели', () => {
    const attack = (type: 'archer' | 'tower' | 'griffon' | 'swordsman') =>
      getEventSfx({ kind: 'attack', id: '1', type });
    expect(
      ['archer', 'tower', 'griffon', 'swordsman'].map(type =>
        attack(type as 'archer'),
      ),
    ).toEqual(['shot', 'shot', 'griffonAttack', 'attack']);

    const death = {
      kind: 'death',
      id: 'u',
      owner: 'p2',
      x: 0,
      y: 0,
      hp: 1,
      building: false,
    } as const;
    expect(getEventSfx({ ...death, type: 'griffon' })).toBe('griffonDeath');
    expect(getEventSfx({ ...death, type: 'rider' })).toBe('death');
    expect(getEventSfx({ ...death, type: 'siege' })).toBe('siegeDeath');
  });
});

describe('diffScene — цель атаки', () => {
  it('два атакующих разбирают две повреждённые цели', () => {
    const sword = unit('swordsman', 2, 'p1', { attackPoints: 1 });
    const archer = unit('archer', 0, 'p1', { attackPoints: 1 });
    const left = unit('spearman', 1, 'p2');
    const right = unit('spearman', 3, 'p2');
    const previous = before(sword, archer, left, right);
    const { events } = diffScene(
      previous,
      [
        { ...sword, attackPoints: 0 } as Unit,
        { ...archer, attackPoints: 0 } as Unit,
        { ...left, hp: left.hp - 5 },
        { ...right, hp: right.hp - 5 },
      ],
      context(),
    );
    const targets = events.flatMap(event =>
      event.kind === 'attack' ? [event.target?.x] : [],
    );
    expect(new Set(targets)).toEqual(new Set([1, 3]));
  });

  it('мечник не уходит к дальней цели, даже если ближняя занята', () => {
    const archer = unit('archer', 0, 'p1', { attackPoints: 1 });
    const sword = unit('swordsman', 2, 'p1', { attackPoints: 1 });
    const near = unit('spearman', 3, 'p2');
    const far = unit('spearman', 5, 'p2');
    const previous = before(archer, sword, near, far);
    const { events } = diffScene(
      previous,
      [
        { ...archer, attackPoints: 0 } as Unit,
        { ...sword, attackPoints: 0 } as Unit,
        { ...near, hp: near.hp - 5 },
        { ...far, hp: far.hp - 5 },
      ],
      context(),
    );
    const swordAttack = events.find(
      event => event.kind === 'attack' && event.id === sword.id,
    );
    expect(swordAttack).toMatchObject({ target: { x: 3 } });
  });

  it('цель вне дальности не приписывается атакующему', () => {
    const archer = unit('archer', 0, 'p1', { attackPoints: 1 });
    const far = unit('spearman', 9, 'p2');
    const previous = before(archer, far);
    const { events } = diffScene(
      previous,
      [{ ...archer, attackPoints: 0 } as Unit, { ...far, hp: far.hp - 5 }],
      context(),
    );
    const shot = events.find(event => event.kind === 'attack');
    expect(shot).toMatchObject({ kind: 'attack', id: archer.id });
    expect(shot && 'target' in shot ? shot.target : undefined).toBeUndefined();
  });
});
