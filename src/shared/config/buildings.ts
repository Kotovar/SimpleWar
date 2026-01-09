import type { Owner } from './common';

export type BuildingType = 'base' | 'mine';

export type Income = {
  gold?: number;
  wood?: number;
};

export type Building = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  owner: Owner;
  income?: Income;
  attack?: number;
  attackPoints?: number;
  maxAttackPoints?: number;
  attackRange?: number;
};

export const BUILDINGS_CONFIG: Record<
  BuildingType,
  Pick<Building, 'maxHp' | 'attack' | 'attackPoints' | 'attackRange' | 'income'>
> = {
  base: { maxHp: 300 },
  mine: { maxHp: 100, income: { gold: 50 } },
};
