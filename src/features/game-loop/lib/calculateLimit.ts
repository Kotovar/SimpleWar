import type { Unit } from '@shared/config';

export const calculateLimit = (units: Unit[]): number =>
  units.reduce((acc, unit) => acc + unit.requiresLimit, 0);
