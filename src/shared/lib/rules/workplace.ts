import type {
  Building,
  CivilUnit,
  Position,
  Resources,
  Unit,
} from '@shared/config';

/**
 * Соседние клетки, включая диагональные: так рабочий строит, чинит,
 * расчищает и обслуживает здание.
 */
export const isAdjacent = (a: Position, b: Position) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;

/** Рабочий, способный добывать: гражданский строитель. */
export const isWorker = (unit: Unit | undefined): unit is CivilUnit =>
  unit?.role === 'civil' && unit.canBuild;

/**
 * Обслуживает ли рабочий здание прямо сейчас: назначен на него, того же
 * владельца и стоит рядом. Очко работы здесь не проверяется.
 *
 * @param worker - Рабочий.
 * @param building - Рудник или лесопилка.
 */
export const isServing = (worker: Unit, building: Building) =>
  isWorker(worker) &&
  worker.workplaceId === building.id &&
  worker.owner === building.owner &&
  isAdjacent(worker, building);

/**
 * Рабочий, назначенный на здание, если он жив и стоит рядом.
 *
 * @param building - Рудник или лесопилка.
 * @param units - Все юниты.
 */
export const findServingWorker = (
  building: Building,
  units: Iterable<Unit>,
): CivilUnit | null => {
  for (const unit of units) {
    if (isServing(unit, building) && isWorker(unit)) return unit;
  }
  return null;
};

/**
 * Доход участника за ход и рабочие, которые на него потратят действие.
 *
 * Ратуша и другие здания с доходом без роли `resource` приносят его сами.
 * Рудник и лесопилка — только с живым назначенным рабочим рядом, у которого
 * осталось рабочее действие: добыча и стройка/ремонт в один ход не сочетаются.
 * Один рабочий кормит одно здание, поэтому двойной добычи нет.
 *
 * @param buildings - Здания участника.
 * @param units - Юниты участника.
 * @returns Доход и ID рабочих, добывающих в этом ходу.
 */
export const calculateTurnIncome = (
  buildings: Building[],
  units: Unit[],
): { income: Resources; miners: string[] } => {
  const income: Resources = { gold: 0, wood: 0 };
  const miners: string[] = [];

  for (const building of buildings) {
    if (!building.income) continue;
    if (building.role === 'resource') {
      const worker = findServingWorker(building, units);
      if (!worker || worker.buildPoints <= 0 || miners.includes(worker.id)) {
        continue;
      }
      miners.push(worker.id);
    }
    income.gold += building.income.gold ?? 0;
    income.wood += building.income.wood ?? 0;
  }

  return { income, miners };
};
