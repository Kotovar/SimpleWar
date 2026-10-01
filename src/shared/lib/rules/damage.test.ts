import { describe, expect, it } from 'vite-plus/test';
import {
  ARMOR,
  DAMAGE_BONUS,
  UNITS_CONFIG,
  type BuildingType,
  type UnitType,
} from '@shared/config';
import {
  calculateDamage,
  canHitTarget,
  getCombatProfile,
  getTargetCategory,
  hasFormationNeighbor,
} from './damage';

const hit = (
  attacker: 'swordsman' | 'spearman' | 'rider' | 'siege' | 'scout',
) => ({
  type: attacker,
  attack: UNITS_CONFIG[attacker].attack,
});

describe('calculateDamage', () => {
  it('без бонуса и брони равен атаке: прежний бой не меняется', () => {
    expect(calculateDamage(hit('swordsman'), { type: 'archer' })).toBe(18);
    expect(
      calculateDamage({ type: 'tower', attack: 20 }, { type: 'base' }),
    ).toBe(20);
  });

  it('добавляет бонус против нужной категории и вычитает броню', () => {
    // Копейщик против всадника: 14 + 16 − 1.
    expect(calculateDamage(hit('spearman'), { type: 'rider' })).toBe(29);
    // Всадник против лучника и рабочего: 16 + 10.
    expect(calculateDamage(hit('rider'), { type: 'archer' })).toBe(26);
    expect(calculateDamage(hit('rider'), { type: 'worker' })).toBe(26);
    // Против копейщика бонуса нет, броня 2.
    expect(calculateDamage(hit('rider'), { type: 'spearman' })).toBe(14);
  });

  it('осада сильна по зданиям и слаба по войскам', () => {
    expect(calculateDamage(hit('siege'), { type: 'barracks' })).toBe(52);
    expect(calculateDamage(hit('siege'), { type: 'swordsman' })).toBe(12);
  });

  it('урон не меньше 1', () => {
    expect(
      calculateDamage({ type: 'scout', attack: 1 }, { type: 'spearman' }),
    ).toBe(1);
  });

  it('не меняет конфигурацию', () => {
    const before = structuredClone({ ARMOR, DAMAGE_BONUS });
    calculateDamage(hit('spearman'), { type: 'rider' });
    expect({ ARMOR, DAMAGE_BONUS }).toEqual(before);
  });
});

describe('категории и особенности', () => {
  it('здания — отдельная категория', () => {
    expect(getTargetCategory('forge')).toBe('building');
    expect(getTargetCategory('rider')).toBe('cavalry');
  });

  it('профиль для карточек: бонусы, защита, воздух', () => {
    expect(getCombatProfile('spearman')).toMatchObject({
      armor: 2,
      bonuses: [{ category: 'cavalry', value: 16 }],
      hitsAir: false,
    });
    expect(getCombatProfile('mage')).toMatchObject({
      damageType: 'magic',
      magicResist: 4,
      hitsAir: true,
    });
    expect(getCombatProfile('griffon')).toMatchObject({
      flies: true,
      hitsAir: true,
    });
    expect(getCombatProfile('healer').heal).toBe(20);
  });
});

describe('типы урона', () => {
  const mage = { type: 'mage' as const, attack: UNITS_CONFIG.mage.attack };

  it('магия проходит сквозь броню, но упирается в магическую защиту', () => {
    expect(calculateDamage(mage, { type: 'spearman' })).toBe(20);
    expect(calculateDamage(mage, { type: 'healer' })).toBe(16);
    // Физическая броня от магии не защищает, магическая — от стрел.
    expect(calculateDamage(hit('swordsman'), { type: 'healer' })).toBe(18);
  });

  it('маг не заменяет осаду: здания держат магию', () => {
    expect(calculateDamage(mage, { type: 'barracks' })).toBe(10);
    expect(calculateDamage(hit('siege'), { type: 'barracks' })).toBeGreaterThan(
      40,
    );
  });

  it('минимум 1 и для магии', () => {
    expect(calculateDamage({ type: 'mage', attack: 2 }, { type: 'base' })).toBe(
      1,
    );
  });
});

describe('матрица земля / воздух', () => {
  const attackers: (UnitType | BuildingType)[] = [
    'swordsman',
    'spearman',
    'rider',
    'scout',
    'siege',
    'archer',
    'tower',
    'mage',
    'griffon',
  ];
  const hitsAir = new Set(['archer', 'tower', 'mage', 'griffon']);

  it.each(attackers)('%s: земля — всегда, воздух — по матрице', attacker => {
    expect(canHitTarget(attacker, 'swordsman')).toBe(true);
    expect(canHitTarget(attacker, 'base')).toBe(true);
    expect(canHitTarget(attacker, 'griffon')).toBe(hitsAir.has(attacker));
  });

  it('лучник — противовоздушная оборона: бонус против летающих', () => {
    expect(
      calculateDamage({ type: 'archer', attack: 22 }, { type: 'griffon' }),
    ).toBe(22 + 6 - 1);
  });
});

describe('Строй', () => {
  const spear = (id: string, x: number, y: number, owner = 'p1') => ({
    id,
    type: 'spearman' as const,
    owner,
    x,
    y,
  });

  it('прибавка к броне снижает только физический урон', () => {
    expect(calculateDamage(hit('rider'), { type: 'spearman' }, 2)).toBe(12);
    expect(
      calculateDamage({ type: 'mage', attack: 20 }, { type: 'spearman' }, 2),
    ).toBe(calculateDamage({ type: 'mage', attack: 20 }, { type: 'spearman' }));
  });

  it('нужен свой копейщик по стороне, не по диагонали', () => {
    const me = spear('a', 2, 2);
    expect(hasFormationNeighbor(me, [me, spear('b', 2, 3)])).toBe(true);
    expect(hasFormationNeighbor(me, [me, spear('b', 3, 3)])).toBe(false);
    expect(hasFormationNeighbor(me, [me, spear('b', 2, 3, 'p2')])).toBe(false);
    expect(hasFormationNeighbor(me, [me])).toBe(false);
    expect(
      hasFormationNeighbor(me, [
        me,
        { id: 'c', type: 'swordsman', owner: 'p1', x: 2, y: 3 },
      ]),
    ).toBe(false);
  });
});
