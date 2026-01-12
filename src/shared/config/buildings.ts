import type { CellType, Owner } from './common';

export type BuildingType = 'base' | 'mine' | 'sawmill' | 'farm' | 'barracks';

export type Income = {
  gold?: number;
  wood?: number;
};

type BuildingCost = {
  gold: number;
  wood: number;
};

export type Building = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  owner: Owner;
  cost: BuildingCost;
  requiredField?: CellType;
  income?: Income;
  attack?: number;
  attackPoints?: number;
  maxAttackPoints?: number;
  attackRange?: number;
  populationSupply?: number;
};

export const BUILDINGS_CONFIG: Record<
  BuildingType,
  Pick<
    Building,
    | 'maxHp'
    | 'attack'
    | 'attackPoints'
    | 'attackRange'
    | 'income'
    | 'cost'
    | 'requiredField'
    | 'populationSupply'
  >
> = {
  base: { maxHp: 300, cost: { gold: 0, wood: 0 }, populationSupply: 10 },
  mine: {
    maxHp: 100,
    income: { gold: 20 },
    cost: { gold: 120, wood: 0 },
    requiredField: 'gold',
  },
  sawmill: {
    maxHp: 70,
    income: { wood: 10 },
    cost: { gold: 80, wood: 100 },
    requiredField: 'forest',
  },
  farm: {
    maxHp: 50,
    cost: { gold: 100, wood: 100 },
    requiredField: 'grass',
    populationSupply: 3,
  },
  barracks: {
    maxHp: 150,
    cost: { gold: 100, wood: 100 },
    requiredField: 'grass',
  },
};
