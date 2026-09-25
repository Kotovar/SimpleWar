import type { Owner, Position } from '@shared/config';
import { getEnemyTargets } from './getEnemyTargets';

/**
 * Возвращает вражеские цели в пределах манхэттенской дальности атаки.
 *
 * @param unitPosition - Позиция атакующего.
 * @param attackRange - Дальность атаки в клетках.
 * @param owner - Сторона атакующего.
 * @returns Доступные цели с координатами и ID.
 */
export const getAttackableTargets = (
  unitPosition: Position,
  attackRange: number,
  owner: Owner,
) => {
  const targets = getEnemyTargets(owner);

  return targets.filter(target => {
    const dist =
      Math.abs(unitPosition.x - target.x) + Math.abs(unitPosition.y - target.y);
    return dist <= attackRange;
  });
};
