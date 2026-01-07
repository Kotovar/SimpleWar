import type { Position } from '@shared/config';
import { getEnemyTargets } from './getEnemyTargets';

export const getAttackableTargets = (
  unitPosition: Position,
  attackRange: number,
) => {
  const targets = getEnemyTargets();

  return targets.filter(target => {
    const dist =
      Math.abs(unitPosition.x - target.x) + Math.abs(unitPosition.y - target.y);
    return dist <= attackRange;
  });
};
