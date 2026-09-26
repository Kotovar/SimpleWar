import type { CellType, Owner } from './common';
import type { Cost } from './economy';
import type { UnitType } from './units';

/** Строковые имена всех типов зданий. */
export type BuildingType =
  | 'base'
  | 'mine'
  | 'sawmill'
  | 'farm'
  | 'barracks'
  | 'tower';

/** Частичный набор ресурсов, которые здание производит за ход. */
export type Income = Partial<Cost>;

/** Поля, которые есть только у экземпляра на карте, а не в статическом конфиге. */
export type InstanceKeys = 'role' | 'type' | 'x' | 'y' | 'id' | 'owner' | 'hp';

type BaseBuilding = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Радиус обзора по Manhattan; не связан с дальностью атаки. */
  sightRange: number;
  owner: Owner;
  cost: Cost;
  requiredField?: CellType;
  income?: Income;
};

/** Здание, которое производит юниты. */
export type ProductionBuilding = BaseBuilding & {
  role: 'production';
  spawningUnits: UnitType[];
  spawnPoints: number;
  maxSpawnPoints: number;
};

/**
 * Здание, которое производит ресурсы. Доход идёт только с назначенным
 * рабочим, который тратит на добычу своё рабочее действие.
 */
export type ResourceBuilding = BaseBuilding & {
  role: 'resource';
  income: Income;
};

/** Здание, которое увеличивает лимит населения. */
export type SupplyBuilding = BaseBuilding & {
  role: 'supply';
  populationSupply: number;
};

/** Здание с боевыми характеристиками. */
export type CombatBuilding = BaseBuilding & {
  role: 'combat';
  attack: number;
  attackPoints: number;
  maxAttackPoints: number;
  attackRange: number;
};

/** Любое здание на карте в зависимости от роли. */
export type Building =
  | ProductionBuilding
  | ResourceBuilding
  | SupplyBuilding
  | CombatBuilding;

export const PRODUCTION_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'base' | 'barracks'>,
  Omit<ProductionBuilding, InstanceKeys>
> = {
  base: {
    maxHp: 700,
    sightRange: 4,
    // Страховка от остановки экономики: доход без рабочего.
    income: { gold: 3, wood: 2 },
    cost: { gold: 0, wood: 0 },
    spawningUnits: ['worker'],
    spawnPoints: 1,
    maxSpawnPoints: 1,
  },
  barracks: {
    maxHp: 150,
    sightRange: 2,
    cost: { gold: 80, wood: 140 },
    requiredField: 'grass',
    spawningUnits: ['swordsman', 'archer'],
    spawnPoints: 0,
    maxSpawnPoints: 1,
  },
};

export const RESOURCE_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'mine' | 'sawmill'>,
  Omit<ResourceBuilding, InstanceKeys>
> = {
  mine: {
    maxHp: 130,
    sightRange: 2,
    income: { gold: 15 },
    cost: { gold: 120, wood: 0 },
    requiredField: 'gold',
  },
  sawmill: {
    maxHp: 90,
    sightRange: 2,
    income: { wood: 15 },
    cost: { gold: 60, wood: 80 },
    requiredField: 'forest',
  },
};

export const SUPPLY_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'farm'>,
  Omit<SupplyBuilding, InstanceKeys>
> = {
  farm: {
    maxHp: 70,
    sightRange: 2,
    cost: { gold: 60, wood: 160 },
    populationSupply: 5,
  },
};

export const COMBAT_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'tower'>,
  Omit<CombatBuilding, InstanceKeys>
> = {
  tower: {
    maxHp: 180,
    sightRange: 4,
    attack: 20,
    attackRange: 3,
    cost: { gold: 150, wood: 200 },
    requiredField: 'grass',
    attackPoints: 0,
    maxAttackPoints: 1,
  },
};

export const BUILDINGS_CONFIG = {
  ...PRODUCTION_BUILDINGS_CONFIG,
  ...RESOURCE_BUILDINGS_CONFIG,
  ...SUPPLY_BUILDINGS_CONFIG,
  ...COMBAT_BUILDINGS_CONFIG,
};
