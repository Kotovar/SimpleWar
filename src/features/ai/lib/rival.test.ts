import { describe, expect, it } from 'vite-plus/test';
import { AI_CONFIG } from '@shared/config';
import { enemyPower, ownPower } from './composition';
import { enemyTarget } from './facts';
import { refreshMemory } from './memory';
import { chooseRival } from './rival';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';
import { STRATEGIES } from './strategy';

/** ИИ `p2` в углу 30×30, ратуши `p1` и `p3` на разном расстоянии. */
const arena = (patch: Partial<Parameters<typeof scene>[0]> = {}) =>
  scene({
    map: grass(30, 30),
    buildings: [ownBuilding('base', 1, 1)],
    units: [own('swordsman', 3, 3)],
    enemies: [
      foe('base', 28, 28, { owner: 'p1' }),
      foe('base', 10, 1, { owner: 'p3' }),
    ],
    opponents: ['p1', 'p3'],
    ...patch,
  });

describe('выбор противника (M3)', () => {
  it('берёт ближайшую известную ратушу и наступает только на неё', () => {
    const { ctx } = arena();
    const rival = chooseRival(ctx);

    expect(rival).toEqual({ owner: 'p3', since: ctx.obs.turn });
    const next = { ...ctx, memory: { ...ctx.memory, rival } };
    expect(enemyTarget(next)).toMatchObject({ owner: 'p3', type: 'base' });
  });

  it('сильная армия рядом отпугивает в пользу слабого дальнего', () => {
    const guards = Array.from({ length: 6 }, (_, i) =>
      foe('swordsman', 9 + i, 3, { owner: 'p3' }),
    );
    const { ctx } = arena({
      enemies: [
        foe('base', 28, 28, { owner: 'p1' }),
        foe('base', 10, 1, { owner: 'p3' }),
        ...guards,
      ],
    });

    expect(chooseRival(ctx)?.owner).toBe('p1');
  });

  it('держит выбор до срока, даже если ближе стал другой', () => {
    const { ctx } = arena({
      turn: 20,
      memory: { rival: { owner: 'p1', since: 20 - AI_CONFIG.rivalHold + 1 } },
    });

    expect(chooseRival(ctx)?.owner).toBe('p1');
    const expired = arena({
      turn: 20,
      memory: { rival: { owner: 'p1', since: 20 - AI_CONFIG.rivalHold } },
    });
    expect(chooseRival(expired.ctx)).toEqual({ owner: 'p3', since: 20 });
  });

  it('нападение на ратушу сразу меняет цель на нападающего', () => {
    const { ctx } = arena({
      turn: 20,
      memory: { rival: { owner: 'p3', since: 19 } },
      enemies: [
        foe('base', 28, 28, { owner: 'p1' }),
        foe('base', 10, 1, { owner: 'p3' }),
        foe('swordsman', 2, 1, { owner: 'p1' }),
      ],
    });

    expect(chooseRival(ctx)).toEqual({ owner: 'p1', since: 20 });
  });

  it('выбывший противник сменяется сразу', () => {
    const { ctx } = arena({
      turn: 20,
      memory: { rival: { owner: 'p4', since: 19 } },
    });

    expect(chooseRival(ctx)?.owner).toBe('p3');
  });

  it('без сведений о противниках выбора нет', () => {
    const { ctx } = arena({ enemies: [] });

    expect(chooseRival(ctx)).toBeNull();
  });

  it('сила для наступления — только выбранного противника', () => {
    const army = Array.from({ length: 6 }, (_, i) =>
      foe('swordsman', 20 + i, 20, { owner: 'p1' }),
    );
    const { ctx } = arena({
      enemies: [
        foe('base', 28, 28, { owner: 'p1' }),
        foe('base', 10, 1, { owner: 'p3' }),
        foe('swordsman', 10, 2, { owner: 'p3' }),
        ...army,
      ],
    });
    const all = enemyPower(ctx);
    const rivalOnly = enemyPower({
      ...ctx,
      memory: { ...ctx.memory, rival: { owner: 'p3', since: 5 } },
    });

    expect(rivalOnly).toBeGreaterThan(0);
    expect(rivalOnly).toBeLessThan(all / 3);
  });

  it('разведка баз продолжается, пока известны не все ратуши', () => {
    const { ctx } = arena({
      enemies: [foe('base', 10, 1, { owner: 'p3' })],
    });

    expect(STRATEGIES.G05(ctx).score).toBeGreaterThan(0);
    expect(STRATEGIES.G05(arena().ctx).score).toBe(0);
  });

  it('память хода хранит выбор', () => {
    expect(refreshMemory(arena().ctx).memory.rival?.owner).toBe('p3');
  });

  it('без известных зданий выбранного противника цели нет — идёт разведка', () => {
    const { ctx } = arena({
      turn: 20,
      memory: { rival: { owner: 'p3', since: 19 } },
      enemies: [
        foe('base', 28, 28, { owner: 'p1' }),
        foe('swordsman', 12, 12, { owner: 'p3' }),
      ],
    });
    const { memory } = refreshMemory(ctx);

    expect(memory.rival?.owner).toBe('p3');
    expect(enemyTarget({ ...ctx, memory })).toBeNull();
  });

  it('пока выбранный нападает на ратушу, потери HP в бою цель не меняют', () => {
    const p1 = foe('swordsman', 2, 1, { owner: 'p1' });
    const p3 = foe('swordsman', 1, 2, { owner: 'p3' });
    let memory = arena().memory;
    const rivals = [];
    for (const [h1, h3] of [
      [1, 0.8],
      [0.5, 0.8],
      [0.5, 0.25],
    ]) {
      const { ctx } = arena({
        turn: 20,
        memory,
        enemies: [
          { ...p1, hp: Math.floor(p1.maxHp * h1) },
          { ...p3, hp: Math.floor(p3.maxHp * h3) },
          foe('base', 28, 28, { owner: 'p1' }),
          foe('base', 10, 1, { owner: 'p3' }),
        ],
      });
      memory = refreshMemory(ctx).memory;
      rivals.push(memory.rival?.owner);
    }

    expect(rivals).toEqual(['p1', 'p1', 'p1']);
  });

  it('чужая армия не обесценивает свою силу против выбранного', () => {
    const units = Array.from({ length: 8 }, (_, i) =>
      own('swordsman', 3 + i, 3),
    );
    const enemies = [
      foe('base', 28, 28, { owner: 'p1' }),
      foe('swordsman', 26, 28, { owner: 'p1' }),
    ];
    const memory = { rival: { owner: 'p1' as const, since: 19 } };
    const before = arena({ turn: 20, units, memory, enemies }).ctx;
    const griffons = Array.from({ length: 8 }, (_, i) =>
      foe('griffon', 15 + (i % 5), 15 + Math.floor(i / 5), { owner: 'p3' }),
    );
    const after = arena({
      turn: 20,
      units,
      memory,
      enemies: [...enemies, foe('base', 10, 1, { owner: 'p3' }), ...griffons],
    }).ctx;

    expect(ownPower(after)).toBe(ownPower(before));
    expect(STRATEGIES.G08(after).score).toBe(STRATEGIES.G08(before).score);
    expect(STRATEGIES.G08(after).score).toBeGreaterThan(0);
  });

  it('забытый контакт живого противника не снимает удержание', () => {
    const { ctx } = arena({
      turn: 11,
      memory: { rival: { owner: 'p3', since: 5 } },
      enemies: [foe('base', 28, 28, { owner: 'p1' })],
    });

    expect(chooseRival(ctx)?.owner).toBe('p3');
  });
});
