import {
  AI_PROFILES,
  BUILDINGS_CONFIG,
  SANDBOX_LIMITS,
  UNITS_CONFIG,
  type SandboxScenario,
} from '@shared/config';

const isCount = (value: unknown, max: number) =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

/**
 * Проверяет сценарий тестирования до старта: известные типы, целые
 * количества в пределах, не больше одного человека.
 *
 * @returns Текст первой ошибки или `null`, если сценарий корректен.
 */
export const validateScenario = (scenario: SandboxScenario): string | null => {
  const humans = scenario.sides.filter(
    ({ controller }) => controller === 'human',
  );
  if (humans.length > 1)
    return 'Человеком может управлять только одна сторона.';
  for (const [index, side] of scenario.sides.entries()) {
    const name = `Сторона ${index + 1}`;
    if (side.profile && !(side.profile in AI_PROFILES)) {
      return `${name}: неизвестный профиль ИИ ${side.profile}.`;
    }
    for (const [type, count] of Object.entries(side.units)) {
      if (!(type in UNITS_CONFIG)) return `${name}: неизвестный юнит ${type}.`;
      if (!isCount(count, SANDBOX_LIMITS.unitsPerType)) {
        return `${name}: юнитов одного типа от 0 до ${SANDBOX_LIMITS.unitsPerType}.`;
      }
    }
    for (const [type, count] of Object.entries(side.buildings)) {
      if (!(type in BUILDINGS_CONFIG) || type === 'base') {
        return `${name}: неизвестное здание ${type}.`;
      }
      if (!isCount(count, SANDBOX_LIMITS.buildingsPerType)) {
        return `${name}: зданий одного типа от 0 до ${SANDBOX_LIMITS.buildingsPerType}.`;
      }
    }
    if (
      !isCount(side.stock.gold, SANDBOX_LIMITS.stock) ||
      !isCount(side.stock.wood, SANDBOX_LIMITS.stock)
    ) {
      return `${name}: запасы — целые числа от 0 до ${SANDBOX_LIMITS.stock}.`;
    }
  }
  return null;
};
