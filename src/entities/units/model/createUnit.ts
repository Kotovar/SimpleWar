import {
  CIVIL_UNITS_CONFIG,
  MILITARY_UNITS_CONFIG,
  Owner,
  Unit,
  UnitType,
} from '@shared/config';

export const createUnit = (
  type: UnitType,
  x: number,
  y: number,
  owner: Owner,
  initialSpawn: boolean,
): Unit | null => {
  const id = `unit_${crypto.randomUUID()}`;

  if (type in MILITARY_UNITS_CONFIG) {
    const config =
      MILITARY_UNITS_CONFIG[type as keyof typeof MILITARY_UNITS_CONFIG];

    return {
      ...config,
      id,
      type,
      x,
      y,
      owner,
      movePoints: initialSpawn ? config.maxMovePoints : config.movePoints,
      hp: config.maxHp,
      role: 'military',
    };
  }

  if (type in CIVIL_UNITS_CONFIG) {
    const config = CIVIL_UNITS_CONFIG[type as keyof typeof CIVIL_UNITS_CONFIG];

    return {
      ...config,
      id,
      type,
      x,
      y,
      owner,
      movePoints: initialSpawn ? config.maxMovePoints : config.movePoints,
      buildPoints: initialSpawn ? config.maxBuildPoints : config.buildPoints,
      hp: config.maxHp,
      role: 'civil',
    };
  }

  return null;
};
