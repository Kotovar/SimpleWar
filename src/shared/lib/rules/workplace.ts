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
 * владельца и находится внутри — на клетке здания. Очко работы здесь не
 * проверяется.
 *
 * @param worker - Рабочий.
 * @param building - Рудник или лесопилка.
 */
export const isServing = (worker: Unit, building: Building) =>
  isWorker(worker) &&
  worker.workplaceId === building.id &&
  worker.owner === building.owner &&
  worker.x === building.x &&
  worker.y === building.y;

/**
 * Юниты внутри зданий: стоят на клетке здания. Их нельзя атаковать и
 * увидеть со стороны — удар по клетке приходится в здание.
 *
 * @param units - Юниты.
 * @param buildings - Здания.
 * @returns ID укрытых юнитов.
 */
export const getShelteredIds = (
  units: Iterable<Unit>,
  buildings: Iterable<Position>,
) => {
  const cells = new Set([...buildings].map(({ x, y }) => `${x},${y}`));
  const ids = new Set<string>();
  for (const unit of units) {
    if (cells.has(`${unit.x},${unit.y}`)) ids.add(unit.id);
  }
  return ids;
};

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
 * Рудник и лесопилка — только с живым назначенным рабочим внутри, у которого
 * осталось рабочее действие: добыча и стройка/ремонт в один ход не сочетаются.
 * Один рабочий кормит одно здание, поэтому двойной добычи нет.
 *
 * Артель (S16) снимает это условие: рабочий добывает, даже потратив
 * рабочее действие на стройку или расчистку.
 *
 * @param buildings - Здания участника.
 * @param units - Юниты участника.
 * @param artel - У участника изучена Артель.
 * @returns Доход и ID рабочих, добывающих в этом ходу.
 */
export const calculateTurnIncome = (
  buildings: Building[],
  units: Unit[],
  artel = false,
): { income: Resources; miners: string[] } => {
  const income: Resources = { gold: 0, wood: 0 };
  const miners = new Set<string>();

  for (const building of buildings) {
    if (!building.income) continue;
    if (building.role === 'resource') {
      const worker = findServingWorker(building, units);
      if (
        !worker ||
        (!artel && worker.buildPoints <= 0) ||
        miners.has(worker.id)
      ) {
        continue;
      }
      miners.add(worker.id);
    }
    income.gold += building.income.gold ?? 0;
    income.wood += building.income.wood ?? 0;
  }

  return { income, miners: [...miners] };
};
