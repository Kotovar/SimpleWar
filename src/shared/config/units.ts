import type { BuildingType, InstanceKeys } from './buildings';
import type { Owner } from './common';
import type { Cost } from './economy';

/** Список военных юнитов. */
export type MilitaryType = 'swordsman' | 'archer';

/** Список гражданских юнитов. */
export type CivilType = 'worker';

/** Все типы юнитов. */
export type UnitType = MilitaryType | CivilType;

/** Роль юнита: военный или гражданский. */
type UnitRole = 'military' | 'civil';

/** Базовая форма юнита, общая для всех ролей. */
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
  /** Радиус обзора по Manhattan; не связан с дальностью атаки. */
  sightRange: number;
  owner: Owner;
  requiresLimit: number;
  cost: Cost;
};

/** Военный юнит */
export type MilitaryUnit = {
  role: 'military';
  attack: number;
  attackPoints: number;
  attackRange: number;
  maxAttackPoints: number;
} & BaseUnit;

/** Гражданский юнит */
export type CivilUnit = {
  role: 'civil';
  canBuild: boolean;
  buildableBuildings: BuildingType[];
  buildPoints: number;
  maxBuildPoints: number;
} & BaseUnit;

/** Любой юнит в зависимости от роли. */
export type Unit = MilitaryUnit | CivilUnit;

/** Статический конфиг боевых юнитов. */
export const MILITARY_UNITS_CONFIG: Record<
  MilitaryType,
  Omit<MilitaryUnit, InstanceKeys>
> = {
  swordsman: {
    maxHp: 110,
    sightRange: 3,
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
    sightRange: 4,
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

/** Статический конфиг гражданских юнитов. */
export const CIVIL_UNITS_CONFIG: Record<
  CivilType,
  Omit<CivilUnit, InstanceKeys>
> = {
  worker: {
    maxHp: 25,
    sightRange: 3,
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

/** Объединённый конфиг всех юнитов по их типам. */
export const UNITS_CONFIG = {
  ...MILITARY_UNITS_CONFIG,
  ...CIVIL_UNITS_CONFIG,
};
