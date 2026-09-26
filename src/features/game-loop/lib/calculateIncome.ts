import type { Building, Resources, Unit } from '@shared/config';
import { calculateTurnIncome } from '@shared/lib';

/**
 * Доход участника за один ход: ратуша приносит свой доход сама, рудник
 * и лесопилка — только с назначенным рабочим рядом, у которого осталось
 * рабочее действие.
 *
 * @param buildings - Здания участника.
 * @param units - Юниты участника; без них ресурсные здания ничего не дают.
 * @param options.rested - Считать, что рабочие действия восстановлены: так
 *   прогноз вне своего хода показывает доход следующего своего хода, а не
 *   уже потраченную добычу.
 * @returns Количество золота и древесины без изменения входных данных.
 */
export const calculateIncome = (
  buildings: Building[],
  units: Unit[] = [],
  { rested = false }: { rested?: boolean } = {},
): Resources =>
  calculateTurnIncome(
    buildings,
    rested
      ? units.map(unit =>
          unit.role === 'civil'
            ? { ...unit, buildPoints: unit.maxBuildPoints }
            : unit,
        )
      : units,
  ).income;
