import {
  CIVIL_UNITS_CONFIG,
  InstanceKeys,
  MILITARY_UNITS_CONFIG,
  Owner,
  Unit,
  UnitType,
} from '@shared/config';

const CONFIGS_BY_ROLE = [
  ['military', MILITARY_UNITS_CONFIG],
  ['civil', CIVIL_UNITS_CONFIG],
] as const;

export const createUnit = (
  type: UnitType,
  x: number,
  y: number,
  owner: Owner,
  initialSpawn: boolean,
): Unit | null => {
  for (const [role, configs] of CONFIGS_BY_ROLE) {
    const config = (
      configs as Partial<Record<UnitType, Omit<Unit, InstanceKeys>>>
    )[type];

    if (config) {
      const unit = {
        ...config,
        id: `unit_${crypto.randomUUID()}`,
        type,
        x,
        y,
        owner,
        hp: config.maxHp,
        role,
      } as Unit;

      if (initialSpawn) {
        unit.movePoints = unit.maxMovePoints;
        if (unit.role === 'civil') unit.buildPoints = unit.maxBuildPoints;
      }

      return unit;
    }
  }

  return null;
};
