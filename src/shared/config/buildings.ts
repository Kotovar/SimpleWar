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
  | 'tower'
  | 'stable'
  | 'workshop'
  | 'forge'
  | 'sanctuary';

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

/**
 * Здание для исследований. Исследований пока нет (S16): кузница строится,
 * но работ не запускает.
 */
export type ResearchBuilding = BaseBuilding & {
  role: 'research';
};

/** Любое здание на карте в зависимости от роли. */
export type Building =
  | ProductionBuilding
  | ResourceBuilding
  | SupplyBuilding
  | CombatBuilding
  | ResearchBuilding;

export const PRODUCTION_BUILDINGS_CONFIG: Record<
  Extract<
    BuildingType,
    'base' | 'barracks' | 'stable' | 'workshop' | 'sanctuary'
  >,
  Omit<ProductionBuilding, InstanceKeys>
> = {
  base: {
    maxHp: 700,
    sightRange: 4,
    // Страховка от остановки экономики: доход без рабочего.
    income: { gold: 3, wood: 2 },
    cost: { gold: 0, wood: 0 },
    spawningUnits: ['worker', 'scout'],
    spawnPoints: 1,
    maxSpawnPoints: 1,
  },
  barracks: {
    maxHp: 150,
    sightRange: 3,
    cost: { gold: 80, wood: 140 },
    requiredField: 'grass',
    spawningUnits: ['swordsman', 'archer', 'spearman'],
    spawnPoints: 0,
    maxSpawnPoints: 1,
  },
  stable: {
    maxHp: 160,
    sightRange: 3,
    cost: { gold: 120, wood: 160 },
    requiredField: 'grass',
    spawningUnits: ['rider'],
    spawnPoints: 0,
    maxSpawnPoints: 1,
  },
  workshop: {
    maxHp: 150,
    sightRange: 3,
    cost: { gold: 140, wood: 180 },
    requiredField: 'grass',
    spawningUnits: ['siege'],
    spawnPoints: 0,
    maxSpawnPoints: 1,
  },
  // Хрупкое место найма мага, лекаря и грифона.
  sanctuary: {
    maxHp: 120,
    sightRange: 3,
    cost: { gold: 160, wood: 140 },
    requiredField: 'grass',
    spawningUnits: ['mage', 'healer', 'griffon'],
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
    sightRange: 3,
    income: { gold: 15 },
    cost: { gold: 120, wood: 0 },
    requiredField: 'gold',
  },
  sawmill: {
    maxHp: 90,
    sightRange: 3,
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
    sightRange: 3,
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

export const RESEARCH_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'forge'>,
  Omit<ResearchBuilding, InstanceKeys>
> = {
  forge: {
    maxHp: 140,
    sightRange: 3,
    cost: { gold: 100, wood: 150 },
    requiredField: 'grass',
  },
};

export const BUILDINGS_CONFIG = {
  ...PRODUCTION_BUILDINGS_CONFIG,
  ...RESOURCE_BUILDINGS_CONFIG,
  ...SUPPLY_BUILDINGS_CONFIG,
  ...COMBAT_BUILDINGS_CONFIG,
  ...RESEARCH_BUILDINGS_CONFIG,
};
