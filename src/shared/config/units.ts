import type { Owner } from './common';

export type UnitType = 'swordsman' | 'archer';

export type Unit = {
  id: string;
  type: UnitType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  movePoints: number;
  maxMovePoints: number;
  attack: number;
  attackPoints: number;
  maxAttackPoints: number;
  owner: Owner;
  attackRange: number;
};

export const UNITS_CONFIG: Record<
  UnitType,
  Pick<Unit, 'maxHp' | 'attack' | 'attackPoints' | 'movePoints' | 'attackRange'>
> = {
  swordsman: {
    maxHp: 100,
    attack: 20,
    movePoints: 3,
    attackPoints: 1,
    attackRange: 1,
  },
  archer: {
    maxHp: 40,
    attack: 25,
    movePoints: 3,
    attackPoints: 1,
    attackRange: 2,
  },
};
