import { describe, expect, it } from 'vite-plus/test';
import { BUILDINGS_CONFIG, type Unit, type UnitOrder } from '@shared/config';
import { getReservedResources, stopUnpaidBuildOrders } from './reservations';

const mine = BUILDINGS_CONFIG.mine.cost;
const worker = (id: string, order?: UnitOrder) =>
  ({ id, owner: 'p1', order }) as Unit;
const build = (extra: Partial<UnitOrder> = {}) =>
  ({ type: 'build', buildingType: 'mine', x: 1, y: 1, ...extra }) as UnitOrder;

describe('getReservedResources', () => {
  it('считает только активные платные приказы стройки', () => {
    const units = [
      worker('a', build()),
      worker('b', build({ stopped: 'path' })),
      worker('c', build({ free: true } as Partial<UnitOrder>)),
      worker('d', { type: 'goto', x: 0, y: 0 }),
    ];
    expect(getReservedResources(units, 'p1')).toEqual(mine);
    expect(getReservedResources(units, 'p1', 'a')).toEqual({
      gold: 0,
      wood: 0,
    });
  });
});

describe('stopUnpaidBuildOrders', () => {
  it('останавливает приказы сверх запаса, оплаченные оставляет', () => {
    const units = { a: worker('a', build()), b: worker('b', build()) };
    const result = stopUnpaidBuildOrders(units, { p1: { ...mine } });
    expect(result.a.order?.stopped).toBeUndefined();
    expect(result.b.order?.stopped).toBe('resources');
    expect(units.b.order?.stopped).toBeUndefined();
  });
});
