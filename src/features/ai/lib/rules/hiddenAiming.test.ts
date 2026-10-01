import { describe, expect, it } from 'vite-plus/test';
import { foe, grass, own, ownBuilding, scene } from '../scene.test-utils';
import { savingGoals } from '../saving';
import { R07 } from './hiddenAiming';
import { N02 } from './production';

describe('R07: разведчик у своих против осады', () => {
  it('держится у армии, а не у самого себя', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [own('scout', 1, 1), own('swordsman', 8, 8)],
      enemies: [foe('siege', 9, 1)],
    });

    expect(R07.evaluate(ctx)).toMatchObject([{ action: { type: 'move' } }]);
  });
});

describe('резерв обороны и кузница', () => {
  it('без армии кузница не отнимает деньги у найма', () => {
    const { ctx } = scene({
      map: grass(10, 10),
      units: [own('worker', 0, 0), own('worker', 0, 1), own('swordsman', 5, 5)],
      buildings: [ownBuilding('base', 1, 1), ownBuilding('barracks', 1, 4)],
      stock: { gold: 180, wood: 150 },
      turn: 35,
    });

    expect(savingGoals(ctx).map(({ key }) => key)).not.toContain('forge');
    expect(N02.evaluate(ctx).length).toBeGreaterThan(0);
  });
});
