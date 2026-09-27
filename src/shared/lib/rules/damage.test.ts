import { describe, expect, it } from 'vite-plus/test';
import { ARMOR, DAMAGE_BONUS, UNITS_CONFIG } from '@shared/config';
import { calculateDamage, getCombatTraits, getTargetCategory } from './damage';

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

  it('описывает броню и бонусы для карточек', () => {
    expect(getCombatTraits('spearman')).toEqual([
      'броня 2',
      '+16 против конницы',
    ]);
    expect(getCombatTraits('swordsman')).toEqual([]);
  });
});
