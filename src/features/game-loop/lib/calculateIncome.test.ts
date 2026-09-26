import { describe, expect, it } from 'vite-plus/test';
import { createBuilding } from '@entities/buildings';
import { createUnit } from '@entities/units';
import type { Building, BuildingType, Unit } from '@shared/config';
import { calculateIncome } from './calculateIncome';

const building = (type: BuildingType, x: number): Building => {
  const result = createBuilding(type, x, 0, 'p1');
  if (!result) throw new Error('Не удалось создать здание ' + type);
  return result;
};

/** Рабочий рядом со зданием, назначенный на него, с рабочим действием. */
const miner = (target: Building, patch: Partial<Unit> = {}): Unit => {
  const unit = createUnit('worker', target.x, 1, 'p1', true);
  if (unit?.role !== 'civil') throw new Error('Не удалось создать рабочего');
  return { ...unit, workplaceId: target.id, ...patch } as Unit;
};

describe('calculateIncome', () => {
  it('returns zero income for an empty list', () => {
    expect(calculateIncome([])).toEqual({ gold: 0, wood: 0 });
  });

  it('town hall pays 3 gold and 2 wood without a worker', () => {
    expect(calculateIncome([building('base', 0)])).toEqual({
      gold: 3,
      wood: 2,
    });
  });

  it('pays nothing for an idle mine or sawmill', () => {
    expect(
      calculateIncome([building('mine', 1), building('sawmill', 2)]),
    ).toEqual({ gold: 0, wood: 0 });
  });

  it('pays served buildings once and leaves input unchanged', () => {
    const mine = building('mine', 1);
    const sawmill = building('sawmill', 4);
    const buildings = [building('base', 0), mine, sawmill, building('farm', 7)];
    const units = [miner(mine), miner(sawmill)];
    const before = structuredClone({ buildings, units });

    expect(calculateIncome(buildings, units)).toEqual({ gold: 18, wood: 17 });
    expect({ buildings, units }).toEqual(before);
  });

  it('needs a living adjacent worker with a work action left', () => {
    const mine = building('mine', 1);
    expect(calculateIncome([mine], [miner(mine, { buildPoints: 0 })])).toEqual({
      gold: 0,
      wood: 0,
    });
    expect(calculateIncome([mine], [miner(mine, { x: 5, y: 5 })])).toEqual({
      gold: 0,
      wood: 0,
    });
    expect(calculateIncome([mine], [miner(mine, { owner: 'p2' })])).toEqual({
      gold: 0,
      wood: 0,
    });
  });

  it('one worker cannot feed two buildings', () => {
    const mine = building('mine', 1);
    const other = building('mine', 2);
    const worker = miner(mine);
    // Назначение одно: второе здание без рабочего не платит.
    expect(calculateIncome([mine, other], [worker])).toEqual({
      gold: 15,
      wood: 0,
    });
  });

  it('forecast outside own turn counts on restored work actions', () => {
    const mine = building('mine', 1);
    const spent = [miner(mine, { buildPoints: 0 })];

    expect(calculateIncome([mine], spent)).toEqual({ gold: 0, wood: 0 });
    expect(calculateIncome([mine], spent, { rested: true })).toEqual({
      gold: 15,
      wood: 0,
    });
    expect(spent[0]).toMatchObject({ buildPoints: 0 });
  });
});
