import { describe, expect, it } from 'vite-plus/test';
import { buildContext } from '../context';
import { createTurnState } from '../memory';
import { grass, own, ownBuilding, foe, scene } from '../scene.test-utils';
import { decideStep } from '../decide';
import { M07 } from './soldiers';
import { hitsOwn } from './siege';

describe('защита союзника', () => {
  it('реальный выбор шага отправляет своего бойца защищать союзную базу', () => {
    const soldier = own('swordsman', 8, 4);
    const { obs, memory } = scene({
      map: grass(20, 10),
      units: [soldier],
      buildings: [ownBuilding('base', 1, 1)],
      stock: { gold: 0, wood: 0 },
      enemies: [foe('swordsman', 11, 4)],
    });
    obs.alliedBuildings = [ownBuilding('base', 14, 4, { owner: 'p3' })];
    const ctx = buildContext(obs, memory, createTurnState());
    const chosen = decideStep(ctx).chosen;
    expect(chosen).toMatchObject({
      ruleId: 'M07',
      actorId: soldier.id,
      action: { type: 'move', unitId: soldier.id },
    });
  });

  it('сначала защищает свою базу, союзной помощи без известной угрозы нет', () => {
    const { obs, memory } = scene({
      map: grass(20, 10),
      units: [own('swordsman', 8, 4)],
      buildings: [ownBuilding('base', 1, 1)],
      enemies: [foe('swordsman', 2, 1)],
    });
    obs.alliedBuildings = [ownBuilding('base', 14, 4, { owner: 'p3' })];
    expect(M07.evaluate(buildContext(obs, memory, createTurnState()))).toEqual(
      [],
    );
    obs.visibleEnemies = [];
    expect(M07.evaluate(buildContext(obs, memory, createTurnState()))).toEqual(
      [],
    );
  });

  it('занятость союзных зданий и юнитов учитывается, приказов за союзника нет', () => {
    const { obs, memory } = scene({
      map: grass(10, 10),
      units: [own('swordsman', 1, 1)],
    });
    obs.alliedUnits = [own('swordsman', 2, 1, { owner: 'p3' })];
    obs.alliedBuildings = [ownBuilding('base', 4, 4, { owner: 'p3' })];
    const ctx = buildContext(obs, memory, createTurnState());
    expect(ctx.occupied(2, 1)).toBe(true);
    expect(ctx.grid(1, true)[1][2]).toBe(1);
    expect(ctx.grid(1, true)[4][4]).toBe(0);
    expect(ctx.military.map(u => u.owner)).toEqual(['p2']);
    expect(hitsOwn(ctx, { x: 2, y: 1 })).toBe(true);
    expect(hitsOwn(ctx, { x: 4, y: 4 })).toBe(true);
    expect(hitsOwn(ctx, { x: 6, y: 6 })).toBe(false);
  });
});
