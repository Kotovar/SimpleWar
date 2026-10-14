import { describe, expect, it } from 'vite-plus/test';
import type { Building, Unit } from '@shared/config';
import { createUnit } from '@entities/units';
import type { SceneEvent } from './diffScene';
import {
  advanceTracks,
  getAnimationFrame,
  getArmPose,
  getBusyTime,
  type AnimationTrack,
} from './animationFrame';
import {
  getMoveDuration,
  getPathPoint,
  LUNGE_DURATION,
  planSceneAnimations,
  WINDUP_DURATION,
} from './unitAnimations';

const unit = (type: Unit['type'], x: number, y: number, owner: 'p1' | 'p2') =>
  createUnit(type, x, y, owner, false)!;

const plan = (
  events: SceneEvent[],
  entities: (Unit | Building)[],
  context: Partial<Parameters<typeof planSceneAnimations>[1]> = {},
) =>
  planSceneAnimations(events, {
    instant: false,
    entity: id => entities.find(entity => entity.id === id),
    ...context,
  });

const damage = (target: Unit, amount: number, strike = false): SceneEvent => ({
  kind: 'damage',
  id: target.id,
  x: target.x,
  y: target.y,
  amount,
  building: false,
  strike,
});

const attack = (attacker: Unit, target: Unit): SceneEvent => ({
  kind: 'attack',
  id: attacker.id,
  type: attacker.type,
  target: { x: target.x, y: target.y },
});

describe('getPathPoint', () => {
  it('точка пути равномерна по клеткам', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(getPathPoint(path, 0.5)).toEqual({ x: 1, y: 0 });
    expect(getPathPoint(path, 0.75)).toEqual({ x: 1, y: 0.5 });
  });
});

describe('planSceneAnimations', () => {
  it('издали: замах → снаряд → попадание → новое HP', () => {
    const archer = unit('archer', 0, 1, 'p1');
    const target = unit('swordsman', 3, 1, 'p2');
    const result = plan(
      [damage(target, 10), attack(archer, target)],
      [archer, target],
    );
    const [shot] = result.projectiles;
    expect(shot).toMatchObject({ kind: 'arrow', start: WINDUP_DURATION });
    const hit = shot.start + shot.duration;
    expect(result.effects[0]).toMatchObject({ damage: 10, start: hit });
    expect(result.holds).toEqual([{ id: target.id, amount: 10, until: hit }]);
    expect(result.lunges.get(target.id)?.start).toBe(hit);
    expect(result.sounds).toContainEqual({ sfx: 'hitUnit', at: hit });
  });

  it('вплотную: выпад, попадание в его пике; маг стреляет сгустком', () => {
    const sword = unit('swordsman', 1, 1, 'p1');
    const target = unit('spearman', 2, 1, 'p2');
    const melee = plan(
      [damage(target, 5), attack(sword, target)],
      [sword, target],
    );
    expect(melee.projectiles).toEqual([]);
    expect(melee.lunges.get(sword.id)?.dx).toBeGreaterThan(0);
    expect(melee.effects[0].start).toBe(LUNGE_DURATION / 2);

    const mage = unit('mage', 0, 0, 'p1');
    const far = unit('spearman', 4, 0, 'p2');
    expect(plan([attack(mage, far)], [mage, far]).projectiles[0].kind).toBe(
      'magic',
    );
  });

  it('несколько ударов по клетке — попадание по последнему, порядок не важен', () => {
    const sword = unit('swordsman', 2, 1, 'p1');
    const archer = unit('archer', 0, 1, 'p1');
    const target = unit('spearman', 3, 1, 'p2');
    const events = [
      damage(target, 12),
      attack(sword, target),
      attack(archer, target),
    ];
    const forward = plan(events, [sword, archer, target]);
    const backward = plan(
      [events[0], events[2], events[1]],
      [sword, archer, target],
    );
    expect(forward.effects[0].start).toBe(backward.effects[0].start);
    expect(forward.effects[0].start).toBeGreaterThan(LUNGE_DURATION / 2);
  });

  it('атака ждёт конца хода; путь — по пройденным клеткам', () => {
    const sword = unit('swordsman', 3, 1, 'p1');
    const target = unit('spearman', 4, 1, 'p2');
    const walked = [
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
    ];
    const result = plan(
      [
        { kind: 'move', id: sword.id, fromX: 0, fromY: 1 },
        damage(target, 5),
        attack(sword, target),
      ],
      [sword, target],
      { trail: () => walked },
    );
    expect(result.moves.get(sword.id)?.path).toEqual(walked);
    expect(result.lunges.get(sword.id)?.start).toBe(getMoveDuration(walked));
  });

  it('ход грифона озвучивается полётом, остальные — ходом', () => {
    const griffon = unit('griffon', 1, 1, 'p1');
    const scout = unit('scout', 0, 1, 'p1');
    const flight = plan(
      [{ kind: 'move', id: griffon.id, fromX: 0, fromY: 1 }],
      [griffon],
    );
    expect(flight.sounds).toEqual([{ sfx: 'griffonFlight', at: 0 }]);
    const walk = plan(
      [{ kind: 'move', id: scout.id, fromX: 0, fromY: 0 }],
      [scout],
    );
    expect(walk.sounds).toEqual([{ sfx: 'move', at: 0 }]);
  });

  it('погибший стоит до попадания; камень осады; без движения — всё сразу', () => {
    const archer = unit('archer', 0, 1, 'p1');
    const events: SceneEvent[] = [
      {
        kind: 'death',
        id: 'gone',
        x: 3,
        y: 1,
        hp: 4,
        building: false,
        type: 'scout',
        owner: 'p2',
      },
      { kind: 'attack', id: archer.id, type: 'archer', target: { x: 3, y: 1 } },
    ];
    const result = plan(events, [archer]);
    expect(result.lingers.get('gone')).toBe(result.effects[0].start);

    const still = plan(events, [archer], { instant: true });
    expect(still.projectiles).toEqual([]);
    expect(still.lingers.size).toBe(0);
    expect(still.effects[0].start).toBe(0);
  });
});

describe('planSceneAnimations — осада и дальность', () => {
  const shot = { from: { x: 0, y: 1 }, to: { x: 5, y: 1 } };
  const dead: SceneEvent = {
    kind: 'death',
    id: 'gone',
    x: 5,
    y: 1,
    hp: 10,
    building: false,
    type: 'worker',
    owner: 'p2',
  };

  it('камень летит и по пустой клетке: воронка и звук удара', () => {
    const result = plan([], [], { strikes: [shot] });
    const [stone] = result.projectiles;
    expect(stone.kind).toBe('stone');
    const hit = stone.start + stone.duration;
    expect(result.effects).toEqual([{ x: 5, y: 1, impact: true, start: hit }]);
    expect(result.sounds).toEqual([{ sfx: 'strike', at: hit }]);
  });

  it('смертельный удар: погибший ждёт камня; здание с рабочим — один камень', () => {
    const lethal = plan([dead], [], { strikes: [shot] });
    const [stone] = lethal.projectiles;
    expect(lethal.lingers.get('gone')).toBe(stone.start + stone.duration);
    expect(lethal.sounds.map(({ sfx }) => sfx)).not.toContain('strike');

    const both = plan(
      [{ ...dead, building: true, type: 'mine', id: 'mine' }, dead],
      [],
      { strikes: [shot] },
    );
    expect(both.projectiles).toHaveLength(1);
  });

  it('невидимое орудие — камень сверху над клеткой', () => {
    const [stone] = plan([], [], { strikes: [{ to: shot.to }] }).projectiles;
    expect(stone.from.x).toBe(5);
    expect(stone.from.y).toBeLessThan(1);
  });

  it('мечник бьёт выпадом даже по дальней цели, наводка — отклик орудия', () => {
    const sword = unit('swordsman', 0, 1, 'p1');
    const far = unit('spearman', 3, 1, 'p2');
    expect(plan([attack(sword, far)], [sword, far]).projectiles).toEqual([]);

    const siege = unit('siege', 0, 1, 'p1');
    const aim = plan(
      [{ kind: 'prepare', id: siege.id, x: 0, y: 1, target: { x: 4, y: 1 } }],
      [siege],
    );
    expect(aim.arms.get(siege.id)).toMatchObject({ from: 0, to: 1 });
    expect(aim.effects[0]).toMatchObject({ x: 4, y: 1, aim: true });
    // Идущее орудие сначала доходит, потом взводится.
    const late = plan(
      [{ kind: 'prepare', id: siege.id, x: 0, y: 1, target: { x: 4, y: 1 } }],
      [siege],
      { busy: () => 600 },
    );
    expect(late.arms.get(siege.id)?.start).toBe(600);
    expect(late.sounds[0].at).toBe(600);
  });

  it('выстрел: рычаг взлетает; скрытая клетка — только взмах', () => {
    const fired = plan([], [], {
      strikes: [{ siegeId: 'siege', ...shot }],
    });
    expect(fired.arms.get('siege')).toMatchObject({
      from: 1,
      to: 0,
      fire: true,
    });
    expect(fired.projectiles[0].from.y).toBeLessThan(shot.from.y);

    const hidden = plan([], [], {
      strikes: [{ siegeId: 'siege', from: shot.from }],
    });
    expect(hidden.arms.has('siege')).toBe(true);
    expect(hidden.projectiles).toEqual([]);
    expect(hidden.effects).toEqual([]);
    expect(hidden.sounds).toEqual([]);
  });
});

describe('getAnimationFrame', () => {
  const target = { ...unit('spearman', 3, 1, 'p2'), hp: 60 };
  const track = (patch: Partial<AnimationTrack['plan']>, t0 = 0) => ({
    plan: { ...plan([], []), ...patch },
    t0,
    ai: false,
  });

  it('HP держится, пока не долетел каждый удар', () => {
    const tracks = [
      track({ holds: [{ id: target.id, amount: 10, until: 390 }] }),
      track({ holds: [{ id: target.id, amount: 5, until: 390 }] }, 100),
    ];
    const at = (time: number) =>
      getAnimationFrame(
        tracks,
        ({ t0 }) => time - t0,
        () => target,
      ).offsets.get(target.id)?.hp;
    expect(at(150)).toBe(75);
    expect(at(450)).toBe(65);
    expect(at(600)).toBeUndefined();
  });

  it('погибший виден до попадания; отложенный звук играет вовремя или снимается', () => {
    const body = unit('scout', 3, 1, 'p2');
    const lingering = {
      ...track({
        lingers: new Map([[body.id, 300]]),
        sounds: [{ sfx: 'death' as const, at: 300 }],
      }),
      bodies: new Map([[body.id, body]]),
    };
    const early = getAnimationFrame(
      [lingering],
      () => 100,
      () => undefined,
    );
    expect(early.bodies).toEqual([body]);
    expect(early.sounds).toEqual([]);
    const late = getAnimationFrame(
      [lingering],
      () => 320,
      () => undefined,
    );
    expect(late.bodies).toEqual([]);
    expect(late.sounds).toEqual(['death']);
    expect(late.tracks).toEqual([]);

    const skipped = track({ sounds: [{ sfx: 'hitUnit', at: 300 }] });
    const frame = getAnimationFrame(
      [skipped],
      () => 50,
      () => undefined,
      () => true,
    );
    expect(frame.sounds).toEqual([]);
    expect(frame.tracks).toEqual([]);
  });

  it('занятость — остаток идущего хода', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const moving = track({ moves: new Map([['u', { path, start: 0 }]]) });
    expect(getBusyTime([moving], () => 100, 'u')).toBe(
      getMoveDuration(path) - 100,
    );
    expect(getBusyTime([moving], () => 1000, 'u')).toBe(0);
  });

  it('без показа движение, снаряды, HP и погибшие завершаются, эффекты остаются', () => {
    const body = unit('scout', 4, 1, 'p2');
    const busy = {
      ...track({
        moves: new Map([
          [target.id, { path: [{ x: 0, y: 1 }, target], start: 0 }],
        ]),
        holds: [{ id: target.id, amount: 10, until: 500 }],
        lingers: new Map([[body.id, 500]]),
        projectiles: [
          {
            kind: 'arrow',
            from: { x: 0, y: 1 },
            to: target,
            start: 0,
            duration: 400,
          },
        ],
        effects: [{ x: 3, y: 1, damage: 10, start: 0 }],
      }),
      bodies: new Map([[body.id, body]]),
    };
    const frame = getAnimationFrame(
      [busy],
      () => 50,
      () => target,
      () => true,
    );
    expect(frame.offsets.size).toBe(0);
    expect(frame.projectiles).toEqual([]);
    expect(frame.bodies).toEqual([]);
    expect(frame.effects).toHaveLength(1);
  });

  it('ход в очереди не перебивает идущий; погибший держит недолетевший урон', () => {
    const path = [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];
    const first = track({ moves: new Map([[target.id, { path, start: 0 }]]) });
    const queued = track({
      moves: new Map([
        [target.id, { path: [target, { x: 4, y: 1 }], start: 360 }],
      ]),
    });
    const frame = getAnimationFrame(
      [first, queued],
      () => 120,
      () => ({
        ...target,
        x: 4,
      }),
    );
    expect(frame.offsets.get(target.id)?.dx).toBeLessThan(-1);

    const body = { ...unit('scout', 3, 1, 'p2'), hp: 80 };
    const hit = track({ holds: [{ id: body.id, amount: 20, until: 400 }] });
    const death = {
      ...track({ lingers: new Map([[body.id, 600]]) }),
      bodies: new Map([[body.id, body]]),
    };
    const bodies = getAnimationFrame(
      [hit, death],
      () => 100,
      () => undefined,
    ).bodies;
    expect(bodies[0].hp).toBe(100);
  });

  it('смена скорости не перематывает показанное', () => {
    const shown = { ...track({}), t0: 0 } as AnimationTrack;
    advanceTracks([shown], 100, () => 2);
    expect(shown.clock).toBe(200);
    advanceTracks([shown], 150, () => 1);
    expect(shown.clock).toBe(250);
  });

  it('поза рычага: взвод плавный, выстрел — до упора и пустая чаша до перезарядки', () => {
    const cock = { from: 0, to: 1, start: 0, duration: 500 };
    expect(getArmPose(cock, -10)).toEqual({ arm: 0, loaded: true });
    expect(getArmPose(cock, 250)?.arm).toBeCloseTo(0.5);
    expect(getArmPose(cock, 600)).toBeNull();
    const fire = {
      from: 1,
      to: 0,
      start: 0,
      duration: 150,
      fire: true,
      reload: 850,
    };
    expect(getArmPose(fire, 10)?.loaded).toBe(true);
    expect(getArmPose(fire, 140)?.loaded).toBe(false);
    expect(getArmPose(fire, 500)).toEqual({ arm: 0, loaded: false });
    expect(getArmPose(fire, 900)).toBeNull();
  });

  it('занятость переводится по скоростям планов', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    const fast = track({ moves: new Map([['u', { path, start: 0 }]]) });
    // Осталось 140 мс анимации при скорости ×2 — это 70 мс реального времени.
    expect(
      getBusyTime(
        [fast],
        () => 100,
        'u',
        () => 2,
      ),
    ).toBe(70);
  });

  it('эффекты плана без показа помечены неподвижными', () => {
    const effect = { x: 0, y: 0, damage: 5, start: 300 };
    const [shown] = getAnimationFrame(
      [track({ effects: [effect] })],
      () => 0,
      () => undefined,
      () => true,
    ).effects;
    expect(shown.still).toBe(true);
  });
});
