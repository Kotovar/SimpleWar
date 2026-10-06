import {
  BUILDINGS_CONFIG,
  type Owner,
  type Resources,
  type Unit,
} from '@shared/config';

/**
 * Ресурсы, отложенные под активные приказы стройки участника. Резерв не
 * хранится отдельно: снятый, заменённый или остановленный приказ, гибель
 * рабочего сразу возвращают ресурсы, а стройка по прибытии тратит их.
 *
 * @param units - Юниты мира.
 * @param owner - Участник.
 * @param exceptUnitId - Рабочий, чей приказ исполняется сейчас: его
 *   резерв доступен ему самому.
 * @returns Сумма цен зданий по неостановленным платным приказам.
 */
export const getReservedResources = (
  units: Iterable<Unit>,
  owner: Owner,
  exceptUnitId?: string,
): Resources => {
  const reserved = { gold: 0, wood: 0 };
  for (const unit of units) {
    const order = unit.order;
    if (unit.owner !== owner || unit.id === exceptUnitId) continue;
    if (order?.type !== 'build' || order.stopped || order.free) continue;
    const { cost } = BUILDINGS_CONFIG[order.buildingType];
    reserved.gold += cost.gold;
    reserved.wood += cost.wood;
  }
  return reserved;
};

/**
 * Запас за вычетом резерва: им оплачиваются найм, стройка, ремонт и
 * исследования, и его же показывает интерфейс.
 *
 * @param stock - Ресурсы участника на складе.
 * @param units - Юниты мира.
 * @param owner - Участник.
 * @param exceptUnitId - См. {@link getReservedResources}.
 */
export const getAvailableResources = (
  stock: Resources,
  units: Iterable<Unit>,
  owner: Owner,
  exceptUnitId?: string,
): Resources => {
  const reserved = getReservedResources(units, owner, exceptUnitId);
  return { gold: stock.gold - reserved.gold, wood: stock.wood - reserved.wood };
};

/**
 * Останавливает приказы стройки, на которые запаса не хватает: в старых
 * сохранениях приказ ставился без резерва. Приказы оплачиваются по порядку
 * ID юнитов; остальные получают отказ `resources`, как по прибытии.
 *
 * @param units - Юниты сохранения; не изменяются.
 * @param stock - Запасы участников.
 * @returns Юниты с остановленными неоплаченными приказами.
 */
export const stopUnpaidBuildOrders = (
  units: Record<string, Unit>,
  stock: Partial<Record<Owner, Resources>>,
) => {
  const left = new Map<Owner, Resources>();
  const result = { ...units };
  for (const id of Object.keys(units).sort()) {
    const unit = units[id];
    const order = unit.order;
    if (order?.type !== 'build' || order.stopped || order.free) continue;
    const rest = left.get(unit.owner) ??
      stock[unit.owner] ?? { gold: 0, wood: 0 };
    const { cost } = BUILDINGS_CONFIG[order.buildingType];
    if (rest.gold < cost.gold || rest.wood < cost.wood) {
      result[id] = { ...unit, order: { ...order, stopped: 'resources' } };
      continue;
    }
    left.set(unit.owner, {
      gold: rest.gold - cost.gold,
      wood: rest.wood - cost.wood,
    });
  }
  return result;
};
