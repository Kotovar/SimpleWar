import { describe, expect, it } from 'vite-plus/test';
import {
  BUILDINGS_CONFIG,
  MILITARY_UNITS_CONFIG,
  type MilitaryType,
  UNITS_CONFIG,
  type BuildingType,
  type UnitType,
} from '@shared/config';
import { calculateDamage } from '@shared/lib';
import { createBuilding } from '@entities/buildings';
import { createUnit } from '@entities/units';

const NEW_UNITS: UnitType[] = [
  'scout',
  'spearman',
  'rider',
  'siege',
  'mage',
  'healer',
  'griffon',
];

describe('состав S14–S14b', () => {
  it('10 юнитов и 10 зданий в конфигурации — состав MVP', () => {
    expect(Object.keys(UNITS_CONFIG)).toHaveLength(10);
    // Частокол Инженерии (S16) — укрепление, а не одно из 10 зданий.
    const buildings = Object.keys(BUILDINGS_CONFIG).filter(
      type => type !== 'palisade',
    );
    expect(buildings).toHaveLength(10);
  });

  it('каждый юнит нанимается ровно в одном здании', () => {
    const hires = Object.entries(BUILDINGS_CONFIG).flatMap(([type, config]) =>
      'spawningUnits' in config
        ? config.spawningUnits.map(unit => [unit, type] as const)
        : [],
    );
    expect(Object.fromEntries(hires)).toEqual({
      worker: 'base',
      scout: 'base',
      swordsman: 'barracks',
      archer: 'barracks',
      spearman: 'barracks',
      rider: 'stable',
      siege: 'workshop',
      mage: 'sanctuary',
      healer: 'sanctuary',
      griffon: 'sanctuary',
    });
  });

  it('рабочий строит все здания, кроме ратуши', () => {
    const worker = createUnit('worker', 0, 0, 'p1', false)!;
    const all = Object.keys(BUILDINGS_CONFIG) as BuildingType[];
    expect(
      worker.role === 'civil' && [...worker.buildableBuildings].sort(),
    ).toEqual(all.filter(type => type !== 'base').sort());
  });

  it('нанятый юнит появляется без очков и без подготовленного удара', () => {
    for (const type of NEW_UNITS) {
      const unit = createUnit(type, 1, 2, 'p2', false)!;
      expect(unit).toMatchObject({
        type,
        role: 'military',
        movePoints: 0,
        attackPoints: 0,
        preparedStrike: null,
        hp: UNITS_CONFIG[type].maxHp,
      });
    }
  });

  it('новые здания создаются со своей ролью и нулём очков найма', () => {
    expect(createBuilding('stable', 0, 0, 'p1')).toMatchObject({
      role: 'production',
      spawnPoints: 0,
    });
    expect(createBuilding('workshop', 0, 0, 'p1')).toMatchObject({
      role: 'production',
    });
    expect(createBuilding('forge', 0, 0, 'p1')).toMatchObject({
      role: 'research',
    });
  });

  it('разведчик видит дальше всех, осада — ближе всех', () => {
    const sight = (type: UnitType) => UNITS_CONFIG[type].sightRange;
    expect(sight('scout')).toBe(6);
    expect(sight('siege')).toBe(2);
  });
});

describe('контрроли', () => {
  /** Сколько ударов нужно `attacker`, чтобы уничтожить `target`. */
  const hits = (attacker: MilitaryType, target: MilitaryType) =>
    Math.ceil(
      UNITS_CONFIG[target].maxHp /
        calculateDamage(
          { type: attacker, attack: MILITARY_UNITS_CONFIG[attacker].attack },
          { type: target },
        ),
    );
  const beats = (a: MilitaryType, b: MilitaryType) => hits(a, b) < hits(b, a);

  it('всадник побеждает лучника, копейщик — всадника', () => {
    expect(beats('rider', 'archer')).toBe(true);
    expect(beats('spearman', 'rider')).toBe(true);
  });

  it('копейщик уступает мечнику в обычном бою', () => {
    expect(beats('swordsman', 'spearman')).toBe(true);
  });

  it('осада сносит здание быстрее, чем пехота, и слаба против войск', () => {
    expect(hits('siege', 'swordsman')).toBeGreaterThan(
      hits('swordsman', 'siege'),
    );
    const building = (attacker: MilitaryType) =>
      calculateDamage(
        { type: attacker, attack: MILITARY_UNITS_CONFIG[attacker].attack },
        { type: 'barracks' },
      );
    expect(building('siege')).toBeGreaterThan(building('swordsman') * 2);
  });
});
