import type { Owner } from './common';

export type BuildingType = 'base';

export type Building = {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  owner: Owner;
  attack?: number;
  attackPoints?: number;
  maxAttackPoints?: number;
  attackRange?: number;
};

export const BUILDINGS_CONFIG: Record<
  BuildingType,
  Pick<Building, 'maxHp' | 'attack' | 'attackPoints' | 'attackRange'>
> = {
  base: { maxHp: 100 },
};
