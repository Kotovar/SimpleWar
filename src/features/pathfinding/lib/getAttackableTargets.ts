import type { BuildingType, Owner, Position, UnitType } from '@shared/config';
import { canHitTarget } from '@shared/lib';
import { getEnemyTargets } from './getEnemyTargets';
import { isVisibleTo } from './createKnownMovementGrid';

/**
 * Возвращает видимые стороне вражеские цели в пределах манхэттенской
 * дальности атаки. Скрытый враг целью не является.
 *
 * @param unitPosition - Позиция атакующего.
 * @param attackRange - Дальность атаки в клетках.
 * @param owner - Сторона атакующего.
 * @param attackerType - Тип атакующего: воздух поражают не все.
 * @returns Доступные цели с координатами и ID.
 */
export const getAttackableTargets = (
  unitPosition: Position,
  attackRange: number,
  owner: Owner,
  attackerType?: UnitType | BuildingType,
) => {
  const targets = getEnemyTargets(owner);

  return targets.filter(target => {
    const dist =
      Math.abs(unitPosition.x - target.x) + Math.abs(unitPosition.y - target.y);
    return (
      dist <= attackRange &&
      (!attackerType || canHitTarget(attackerType, target.type)) &&
      isVisibleTo(owner, target.x, target.y)
    );
  });
};
