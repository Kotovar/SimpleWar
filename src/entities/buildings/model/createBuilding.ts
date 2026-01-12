import {
  Building,
  BuildingType,
  COMBAT_BUILDINGS_CONFIG,
  Owner,
  PRODUCTION_BUILDINGS_CONFIG,
  RESOURCE_BUILDINGS_CONFIG,
  SUPPLY_BUILDINGS_CONFIG,
} from '@shared/config';

export const createBuilding = (
  type: BuildingType,
  x: number,
  y: number,
  owner: Owner,
): Building | null => {
  const id = `building_${crypto.randomUUID()}`;

  if (type in PRODUCTION_BUILDINGS_CONFIG) {
    const config =
      PRODUCTION_BUILDINGS_CONFIG[
        type as keyof typeof PRODUCTION_BUILDINGS_CONFIG
      ];

    return {
      ...config,
      id,
      type,
      x,
      y,
      owner,
      hp: config.maxHp,
      role: 'production',
    };
  }

  if (type in RESOURCE_BUILDINGS_CONFIG) {
    const config =
      RESOURCE_BUILDINGS_CONFIG[type as keyof typeof RESOURCE_BUILDINGS_CONFIG];

    return {
      ...config,
      id,
      type,
      x,
      y,
      owner,
      hp: config.maxHp,
      role: 'resource',
    };
  }

  if (type in SUPPLY_BUILDINGS_CONFIG) {
    const config =
      SUPPLY_BUILDINGS_CONFIG[type as keyof typeof SUPPLY_BUILDINGS_CONFIG];

    return {
      ...config,
      id,
      type,
      x,
      y,
      owner,
      hp: config.maxHp,
      role: 'supply',
    };
  }

  if (type in COMBAT_BUILDINGS_CONFIG) {
    const config =
      COMBAT_BUILDINGS_CONFIG[type as keyof typeof COMBAT_BUILDINGS_CONFIG];

    return {
      ...config,
      id,
      type,
      x,
      y,
      owner,
      hp: config.maxHp,
      attack: config.attack,
      attackRange: config.attackRange,
      attackPoints: config.attackPoints,
      maxAttackPoints: config.attackPoints,
      role: 'combat',
    };
  }

  return null;
};
