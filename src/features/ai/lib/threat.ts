import {
  MILITARY_UNITS_CONFIG,
  type Position,
  type UnitType,
} from '@shared/config';
import { canHitTarget, isFlyingType } from '@shared/lib';
import type { Observation } from '@entities/perceptions';
import type { EnemyView } from './context';
import { cellKey, manhattan } from './geometry';

/**
 * Угроза клеток по наблюдению: досягаемость известных врагов и публичные
 * отметки подготовленных ударов. Отметка публична, орудие — нет: угроза
 * клетки считается без знания о нём.
 *
 * @param obs - Наблюдение стороны.
 * @param known - Видимые и запомненные враги.
 */
export const createThreat = (obs: Observation, known: EnemyView[]) => {
  const { width } = obs;
  const threats = known.filter(({ armed }) => armed);
  const strikes = new Set(obs.strikes.map(({ x, y }) => cellKey(x, y, width)));
  const struck = ({ x, y }: Position) => strikes.has(cellKey(x, y, width));
  const strikeThreat = MILITARY_UNITS_CONFIG.siege.attack;
  const threatAt = (p: Position, target?: UnitType) =>
    threats.reduce(
      (sum, enemy) =>
        manhattan(enemy, p) <= enemy.move + enemy.range &&
        (!target || canHitTarget(enemy.type, target))
          ? sum + enemy.attack * enemy.certainty
          : sum,
      // Удар осады воздух не задевает.
      struck(p) && (!target || !isFlyingType(target)) ? strikeThreat : 0,
    );
  return { threatAt, struck };
};
