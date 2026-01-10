import type { Owner } from './common';

export type BuildingType = 'base' | 'mine' | 'sawmill';

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
  income?: Income;
  attack?: number;
  attackPoints?: number;
  maxAttackPoints?: number;
  attackRange?: number;
};

export const BUILDINGS_CONFIG: Record<
  BuildingType,
  Pick<
    Building,
    'maxHp' | 'attack' | 'attackPoints' | 'attackRange' | 'income' | 'cost'
  >
> = {
  base: { maxHp: 300, cost: { gold: 0, wood: 0 } },
  mine: { maxHp: 100, income: { gold: 50 }, cost: { gold: 120, wood: 0 } },
  sawmill: { maxHp: 100, income: { wood: 50 }, cost: { gold: 80, wood: 100 } },
};
