import type { AiProfile } from './aiProfiles';
import type { BuildingType } from './buildings';
import type { Resources } from './economy';
import type { Controller } from './gameLoop';
import type { UnitType } from './units';

/** Здания, которые можно выставить в тесте: ратуша у каждой стороны одна. */
export type SandboxBuildingType = Exclude<BuildingType, 'base'>;

/**
 * Сторона сценария тестирования: кто управляет, что выставлено на старте
 * сверх ратуши и рабочего и с какими запасами.
 */
export type SandboxSide = {
  controller: Controller;
  /** Профиль ИИ (S17); без него — нейтральные настройки. */
  profile?: AiProfile;
  units: Partial<Record<UnitType, number>>;
  buildings: Partial<Record<SandboxBuildingType, number>>;
  stock: Resources;
};

/**
 * Сценарий режима тестирования баланса (S15a) — данные, одинаковые для
 * интерфейса и headless-прогона: карта, стороны и лимит ходов прогона.
 */
export type SandboxScenario = {
  /** Пустое поле вместо сгенерированной карты: бой без рельефа. */
  emptyField: boolean;
  sides: [SandboxSide, SandboxSide];
};

/** Пределы состава: юнитов и зданий каждого типа, запасов. */
export const SANDBOX_LIMITS = {
  unitsPerType: 20,
  buildingsPerType: 5,
  stock: 99_999,
};

/** Заготовка: ИИ против ИИ со смешанной армией. */
export const DEFAULT_SANDBOX: SandboxScenario = {
  emptyField: false,
  sides: [
    {
      controller: 'ai',
      units: { swordsman: 3, archer: 2, spearman: 1 },
      buildings: { barracks: 1, farm: 1 },
      stock: { gold: 500, wood: 500 },
    },
    {
      controller: 'ai',
      units: { swordsman: 2, archer: 1, rider: 2 },
      buildings: { barracks: 1, stable: 1, farm: 1 },
      stock: { gold: 500, wood: 500 },
    },
  ],
};
