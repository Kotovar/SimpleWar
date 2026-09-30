import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import {
  ARMOR,
  BUILDINGS_CONFIG,
  COMBAT_BUILDINGS_CONFIG,
  DAMAGE_BONUS,
  DAMAGE_TYPE,
  HITS_AIR,
  MAGIC_RESIST,
  STRATEGY_NAME,
  UNIT_CATEGORY,
  UNITS_CONFIG,
  type BuildingType,
  type UnitType,
} from '@shared/config';
import { AI_RULES } from '@features/ai';

/**
 * Гайдбук — статическая страница с числами, переписанными вручную.
 * Проверка ловит расхождение калькулятора урона и счётчиков с игрой.
 */
const html = readFileSync(
  new URL('../docs/guidebook/index.html', import.meta.url),
  'utf8',
);

type GuideUnit = {
  hp?: number;
  atk?: number;
  cat?: string;
  armor?: number;
  mres?: number;
  air?: number;
  magic?: number;
  bonus?: Record<string, number>;
};

/** Данные калькулятора: JSON-блок `#calc-data` страницы. */
const calcData = (() => {
  const match = html.match(
    /<script type="application\/json" id="calc-data">([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error('В гайдбуке нет блока данных калькулятора');
  return JSON.parse(match[1]) as {
    units: Record<string, GuideUnit>;
    buildings: Record<string, [string, number]>;
  };
})();

describe('гайдбук совпадает с настройками игры', () => {
  const { units, buildings } = calcData;

  it('юниты калькулятора', () => {
    for (const [type, unit] of Object.entries(units)) {
      if (type === 'tower') continue;
      const config = UNITS_CONFIG[type as UnitType];
      expect(unit.hp, type).toBe(config.maxHp);
      expect(unit.atk ?? 0, type).toBe('attack' in config ? config.attack : 0);
      expect(unit.cat, type).toBe(UNIT_CATEGORY[type as UnitType]);
      expect(unit.armor ?? 0, type).toBe(ARMOR[type as UnitType] ?? 0);
      expect(unit.mres ?? 0, type).toBe(MAGIC_RESIST[type as UnitType] ?? 0);
      expect(Boolean(unit.air), type).toBe(HITS_AIR.includes(type as UnitType));
      expect(Boolean(unit.magic), type).toBe(
        DAMAGE_TYPE[type as UnitType] === 'magic',
      );
      expect(unit.bonus ?? {}, type).toEqual(
        DAMAGE_BONUS[type as keyof typeof DAMAGE_BONUS] ?? {},
      );
    }
    expect(Object.keys(units).sort()).toEqual(
      [...Object.keys(UNITS_CONFIG), 'tower'].sort(),
    );
  });

  it('башня и здания', () => {
    expect(units.tower.atk).toBe(COMBAT_BUILDINGS_CONFIG.tower.attack);
    expect(Boolean(units.tower.air)).toBe(HITS_AIR.includes('tower'));
    expect(Object.keys(buildings).sort()).toEqual(
      Object.keys(BUILDINGS_CONFIG).sort(),
    );
    for (const [type, [, hp]] of Object.entries(buildings)) {
      expect(hp, type).toBe(BUILDINGS_CONFIG[type as BuildingType].maxHp);
      expect(MAGIC_RESIST[type as BuildingType], type).toBe(10);
    }
  });

  it('правила и стратегии ИИ', () => {
    expect(html).toContain(`<b>${AI_RULES.length}</b>`);
    expect(html).toContain(`${AI_RULES.length} правило поведения`);
    for (const [id, name] of Object.entries(STRATEGY_NAME)) {
      expect(html).toContain(`['${id}', '${name}'`);
    }
  });
});
