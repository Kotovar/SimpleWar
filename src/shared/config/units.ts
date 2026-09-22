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
    maxHp: 110,
    attack: 18,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 90, wood: 0 },
  },
  archer: {
    maxHp: 55,
    attack: 22,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 3,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 110, wood: 120 },
  },
};

export const CIVIL_UNITS_CONFIG: Record<
  CivilType,
  Omit<CivilUnit, ConfigOmit>
> = {
  worker: {
    maxHp: 25,
    movePoints: 0,
    maxMovePoints: 4,
    buildPoints: 0,
    maxBuildPoints: 1,
    canBuild: true,
    buildableBuildings: ['mine', 'sawmill', 'farm', 'barracks', 'tower'],
    requiresLimit: 1,
    cost: { gold: 40, wood: 40 },
  },
};

export const UNITS_CONFIG = {
  ...MILITARY_UNITS_CONFIG,
  ...CIVIL_UNITS_CONFIG,
};
