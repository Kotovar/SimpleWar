import type { BuildingType } from './buildings';
import type { Owner } from './common';
import type { Cost } from './economy';

export type MilitaryType = 'swordsman' | 'archer';
export type CivilType = 'worker';
export type UnitType = MilitaryType | CivilType;
export type UnitRole = 'military' | 'civil';

type ConfigOmit = 'role' | 'type' | 'x' | 'y' | 'id' | 'owner' | 'hp';

type BaseUnit = {
  id: string;
  type: MilitaryType | CivilType;
  role: UnitRole;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  movePoints: number;
  maxMovePoints: number;
  owner: Owner;
  requiresLimit: number;
  cost: Cost;
};

export type MilitaryUnit = {
  role: 'military';
  attack: number;
  attackPoints: number;
  attackRange: number;
  maxAttackPoints: number;
} & BaseUnit;

export type CivilUnit = {
  role: 'civil';
  canBuild: boolean;
  buildableBuildings: BuildingType[];
  buildPoints: number;
  maxBuildPoints: number;
} & BaseUnit;

export type Unit = MilitaryUnit | CivilUnit;

export const MILITARY_UNITS_CONFIG: Record<
  MilitaryType,
  Omit<MilitaryUnit, ConfigOmit>
> = {
  swordsman: {
    maxHp: 100,
    attack: 20,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 100, wood: 0 },
  },
  archer: {
    maxHp: 40,
    attack: 25,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 2,
    maxAttackPoints: 1,
    requiresLimit: 3,
    cost: { gold: 150, wood: 100 },
  },
};

export const CIVIL_UNITS_CONFIG: Record<
  CivilType,
  Omit<CivilUnit, ConfigOmit>
> = {
  worker: {
    maxHp: 20,
    movePoints: 0,
    maxMovePoints: 4,
    buildPoints: 0,
    maxBuildPoints: 1,
    canBuild: true,
    buildableBuildings: ['mine', 'sawmill', 'farm'],
    requiresLimit: 1,
    cost: { gold: 50, wood: 50 },
  },
};

export const UNITS_CONFIG = {
  ...MILITARY_UNITS_CONFIG,
  ...CIVIL_UNITS_CONFIG,
};
