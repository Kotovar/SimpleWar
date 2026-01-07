import { useUnitsStore } from '@entities/units';
import type { Owner } from '@shared/config';

export const canEndTurn = (owner: Owner) => {
  const units = Object.values(useUnitsStore.getState().units);

  return !units.some(unit => unit.owner === owner && unit.movePoints > 0);
};
