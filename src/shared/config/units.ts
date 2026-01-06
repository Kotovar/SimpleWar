import type { Owner } from './common';

export type UnitType = 'swordsman';

export type Unit = {
  id: string;
  type: UnitType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  moveRange: number;
  attack: number;
  owner: Owner;
  attackRange: number;
};

export const UNITS_CONFIG: Record<
  UnitType,
  Pick<Unit, 'maxHp' | 'attack' | 'moveRange' | 'attackRange'>
> = {
  swordsman: {
    maxHp: 100,
    attack: 20,
    moveRange: 3,
    attackRange: 1,
  },
};
