import type { Owner, Position } from '@shared/config';
import { getEnemyTargets } from './getEnemyTargets';

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
