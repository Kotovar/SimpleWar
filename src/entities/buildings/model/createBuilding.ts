import {
  Building,
  BuildingType,
  COMBAT_BUILDINGS_CONFIG,
  InstanceKeys,
  Owner,
  PRODUCTION_BUILDINGS_CONFIG,
  RESOURCE_BUILDINGS_CONFIG,
  SUPPLY_BUILDINGS_CONFIG,
} from '@shared/config';

const CONFIGS_BY_ROLE = [
  ['production', PRODUCTION_BUILDINGS_CONFIG],
  ['resource', RESOURCE_BUILDINGS_CONFIG],
  ['supply', SUPPLY_BUILDINGS_CONFIG],
  ['combat', COMBAT_BUILDINGS_CONFIG],
] as const;

export const createBuilding = (
  type: BuildingType,
  x: number,
  y: number,
  owner: Owner,
): Building | null => {
  for (const [role, configs] of CONFIGS_BY_ROLE) {
    const config = (
      configs as Partial<Record<BuildingType, Omit<Building, InstanceKeys>>>
    )[type];

    if (config) {
      return {
        ...config,
        id: `building_${crypto.randomUUID()}`,
        type,
        x,
        y,
        owner,
        hp: config.maxHp,
        role,
      } as Building;
    }
  }

  return null;
};
