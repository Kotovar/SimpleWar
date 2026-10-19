import { describe, expect, it } from 'vite-plus/test';
import { START_RESOURCES } from '@shared/config';
import { createUnit } from '@entities/units';
import { createBuilding } from '@entities/buildings';
import { getPlayerResult } from './gameResult';

const world = (): Parameters<typeof getPlayerResult>[1] => {
  const worker = createUnit('worker', 1, 1, 'p1', false)!;
  if (worker.role !== 'civil') throw new Error('Нужен рабочий');
  worker.workplaceId = 'mine';
  return {
    units: {
      worker,
      soldier: createUnit('swordsman', 2, 1, 'p1', false)!,
      enemy: createUnit('griffon', 8, 8, 'p2', false)!,
    },
    buildings: {
      mine: { ...createBuilding('mine', 1, 1, 'p1')!, id: 'mine' },
      enemy: createBuilding('base', 9, 8, 'p2')!,
    },
    resources: { ...START_RESOURCES, p1: { gold: 99, wood: 7 } },
    completed: {
      p1: ['engineering'],
      p2: ['formation'],
    },
  };
};

describe('итоги игрока', () => {
  it('считает собственные силы, включая рабочих внутри зданий, запасы и изученное', () => {
    expect(getPlayerResult('p1', world())).toEqual({
      units: 2,
      buildings: 1,
      gold: 99,
      wood: 7,
      research: ['engineering'],
    });
  });

  it('не меняется от скрытых сил, ресурсов и исследований противника', () => {
    const data = world();
    const before = getPlayerResult('p1', data);
    delete data.units.enemy;
    data.buildings.enemy.hp = 1;
    data.resources.p2 = { gold: 9999, wood: 0 };
    data.completed.p2 = ['formation', 'hiddenAiming'];
    expect(getPlayerResult('p1', data)).toEqual(before);
  });

  it('не привязан к первой стороне и возвращает снимок завершённых исследований', () => {
    const data = world();
    expect(getPlayerResult('p3', data)).toMatchObject({
      units: 0,
      buildings: 0,
      research: [],
      ...START_RESOURCES.p3,
    });
    const result = getPlayerResult('p1', data);
    data.completed.p1 = ['engineering', 'artel'];
    data.resources.p1.gold = 0;
    expect(result).toMatchObject({ gold: 99, research: ['engineering'] });
  });
});
