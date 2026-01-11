import { BuildingType } from './buildings';
import type { Owner } from './common';

export type MilitaryType = 'swordsman' | 'archer';
export type CivilType = 'worker';
export type UnitRole = 'military' | 'civil';

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
  Pick<
    MilitaryUnit,
    | 'maxHp'
    | 'attack'
    | 'attackPoints'
    | 'movePoints'
    | 'attackRange'
    | 'maxAttackPoints'
    | 'requiresLimit'
  >
> = {
  swordsman: {
    maxHp: 100,
    attack: 20,
    movePoints: 3,
    attackPoints: 1,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 2,
  },
  archer: {
    maxHp: 40,
    attack: 25,
    movePoints: 3,
    attackPoints: 1,
    attackRange: 2,
    maxAttackPoints: 1,
    requiresLimit: 3,
  },
};

export const CIVIL_UNITS_CONFIG: Record<
  CivilType,
  Pick<
    CivilUnit,
    | 'maxHp'
    | 'movePoints'
    | 'canBuild'
    | 'buildableBuildings'
    | 'buildPoints'
    | 'maxBuildPoints'
    | 'requiresLimit'
  >
> = {
  worker: {
    maxHp: 20,
    movePoints: 3,
    buildPoints: 1,
    maxBuildPoints: 1,
    canBuild: true,
    buildableBuildings: ['mine', 'sawmill', 'farm'],
    requiresLimit: 1,
  },
};
