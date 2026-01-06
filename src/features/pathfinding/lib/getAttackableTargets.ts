import type { Position } from '@shared/config';
import { getEnemyTargets } from './getEnemyTargets';

export const getAttackableTargets = (
  unitPosition: Position,
  reachableCells: Position[],
  attackRange: number,
) => {
  const attackOrigins: Position[] = [unitPosition, ...reachableCells];

  const targets = getEnemyTargets();

  return targets.filter(target =>
    attackOrigins.some(pos => {
      const dist = Math.abs(pos.x - target.x) + Math.abs(pos.y - target.y);

      return dist <= attackRange;
    }),
  );
};
