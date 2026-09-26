import {
  Building,
  BuildingType,
  COMBAT_BUILDINGS_CONFIG,
  Owner,
  PRODUCTION_BUILDINGS_CONFIG,
  RESOURCE_BUILDINGS_CONFIG,
  SUPPLY_BUILDINGS_CONFIG,
} from '@shared/config';

/** Сужает строку до ключа конфигурации конкретной роли. */
const hasConfig = <T extends object>(
  configs: T,
  type: BuildingType,
): type is BuildingType & keyof T => Object.hasOwn(configs, type);

/**
 * Создаёт здание по конфигурации его роли.
 *
 * @param type - Тип здания.
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 * @param owner - Сторона владельца.
 * @returns Новое здание или `null` для неизвестного типа во время выполнения.
 */
export const createBuilding = (
  type: BuildingType,
  x: number,
  y: number,
  owner: Owner,
): Building | null => {
  const instance = { id: `building_${crypto.randomUUID()}`, type, x, y, owner };

  if (hasConfig(PRODUCTION_BUILDINGS_CONFIG, type)) {
    const config = PRODUCTION_BUILDINGS_CONFIG[type];
    return { ...config, ...instance, hp: config.maxHp, role: 'production' };
  }
  if (hasConfig(RESOURCE_BUILDINGS_CONFIG, type)) {
    const config = RESOURCE_BUILDINGS_CONFIG[type];
    return { ...config, ...instance, hp: config.maxHp, role: 'resource' };
  }
  if (hasConfig(SUPPLY_BUILDINGS_CONFIG, type)) {
    const config = SUPPLY_BUILDINGS_CONFIG[type];
    return { ...config, ...instance, hp: config.maxHp, role: 'supply' };
  }
  if (hasConfig(COMBAT_BUILDINGS_CONFIG, type)) {
    const config = COMBAT_BUILDINGS_CONFIG[type];
    return { ...config, ...instance, hp: config.maxHp, role: 'combat' };
  }

  return null;
};
