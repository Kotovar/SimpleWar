import { describe, expect, it } from 'vite-plus/test';
import { own, ownBuilding, scene } from '../scene.test-utils';
import { pickBuildSite } from './building';

describe('площадка стройки', () => {
  it('избегает места недавней потери, когда есть другие площадки', () => {
    const spec = {
      map: ['.......', '.......', '.......', '.......'],
      buildings: [ownBuilding('base', 0, 0)],
    };
    const first = pickBuildSite(scene(spec).ctx, 'farm')!;
    const second = pickBuildSite(
      scene({
        ...spec,
        memory: { siegeLosses: { [`${first.x},${first.y}`]: 7 } },
      }).ctx,
      'farm',
    );
    expect(second).not.toEqual(first);
  });
  it('не выбирает клетку, перекрывающую последний проход', () => {
    const corridor = ['^^^^^^^', '......?', '^^^^^^^'];
    const { ctx } = scene({
      map: corridor,
      units: [own('worker', 1, 1)],
      buildings: [ownBuilding('base', 0, 1)],
    });

    expect(pickBuildSite(ctx, 'farm')).toBeNull();
  });

  it('в широком проходе площадка находится', () => {
    const wide = ['^^^^^^^', '......?', '.......', '^^^^^^^'];
    const { ctx } = scene({
      map: wide,
      units: [own('worker', 1, 1)],
      buildings: [ownBuilding('base', 0, 1)],
    });

    expect(pickBuildSite(ctx, 'farm')).not.toBeNull();
  });
});
