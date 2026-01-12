import type { CellType, Owner } from './common';
import type { Cost } from './economy';
import type { UnitType } from './units';

export type BuildingType =
  | 'base'
  | 'mine'
  | 'sawmill'
  | 'farm'
  | 'barracks'
  | 'tower';

export type BuildingRole = 'production' | 'resource' | 'supply' | 'combat';

export type Income = {
  gold?: number;
  wood?: number;
};

type ConfigOmit = 'role' | 'type' | 'x' | 'y' | 'id' | 'owner' | 'hp';

type BaseBuilding = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  owner: Owner;
  cost: Cost;
  requiredField?: CellType;
  income?: Income;
};

export type ProductionBuilding = BaseBuilding & {
  role: 'production';
  canSpawn: true;
  spawningUnits: UnitType[];
  spawnPoints: number;
  maxSpawnPoints: number;
  populationSupply?: number;
};

export type ResourceBuilding = BaseBuilding & {
  role: 'resource';
  canSpawn: false;
  income: Income;
};

export type SupplyBuilding = BaseBuilding & {
  role: 'supply';
  canSpawn: false;
  populationSupply: number;
};

export type CombatBuilding = BaseBuilding & {
  role: 'combat';
  attack: number;
  attackPoints: number;
  maxAttackPoints: number;
  attackRange: number;
};

export type Building =
  | ProductionBuilding
  | ResourceBuilding
  | SupplyBuilding
  | CombatBuilding;

export const PRODUCTION_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'base' | 'barracks'>,
  Omit<ProductionBuilding, ConfigOmit>
> = {
  base: {
    maxHp: 700,
    income: { gold: 3 },
    cost: { gold: 0, wood: 0 },
    canSpawn: true,
    spawningUnits: ['worker'],
    spawnPoints: 1,
    maxSpawnPoints: 1,
    populationSupply: 10,
  },
  barracks: {
    maxHp: 150,
    cost: { gold: 80, wood: 140 },
    requiredField: 'grass',
    canSpawn: true,
    spawningUnits: ['swordsman', 'archer'],
    spawnPoints: 0,
    maxSpawnPoints: 1,
  },
};

export const RESOURCE_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'mine' | 'sawmill'>,
  Omit<ResourceBuilding, ConfigOmit>
> = {
  mine: {
    maxHp: 130,
    income: { gold: 15 },
    cost: { gold: 120, wood: 0 },
    requiredField: 'gold',
    canSpawn: false,
  },
  sawmill: {
    maxHp: 90,
    income: { wood: 15 },
    cost: { gold: 60, wood: 80 },
    requiredField: 'forest',
    canSpawn: false,
  },
};

export const SUPPLY_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'farm'>,
  Omit<SupplyBuilding, ConfigOmit>
> = {
  farm: {
    maxHp: 70,
    cost: { gold: 60, wood: 160 },
    populationSupply: 5,
    canSpawn: false,
  },
};

export const COMBAT_BUILDINGS_CONFIG: Record<
  Extract<BuildingType, 'tower'>,
  Omit<CombatBuilding, ConfigOmit>
> = {
  tower: {
    maxHp: 180,
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
