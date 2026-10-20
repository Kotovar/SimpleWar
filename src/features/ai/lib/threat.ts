import {
  MILITARY_UNITS_CONFIG,
  type Position,
  type UnitType,
} from '@shared/config';
import {
  canHitTarget,
  findCheapestPaths,
  isFlyingType,
  type MovementGrid,
} from '@shared/lib';
import type { Observation } from '@entities/perceptions';
import type { EnemyView } from './context';
import { cellKey, fromKey, manhattan } from './geometry';

/**
 * Угроза клеток по наблюдению: досягаемость известных врагов и публичные
 * отметки подготовленных ударов. Отметка публична, орудие — нет: угроза
 * клетки считается без знания о нём.
 *
 * @param obs - Наблюдение стороны.
 * @param known - Видимые и запомненные враги.
 * @param grid - Цены входа по известной местности и дорогам; юниты не
 * преграждают (враг проходит сквозь своих), здания — преграда.
 */
export const createThreat = (
  obs: Observation,
  known: EnemyView[],
  grid: () => MovementGrid,
) => {
  const { width } = obs;
  const threats = known.filter(({ armed }) => armed);
  const hasRoads = !!obs.knownRoads?.some(row => row.some(Boolean));
  // Клетки, куда наземный враг доходит по дороге дальше `move` по прямой.
  const farReach = new Map<EnemyView, Position[]>();
  const roadReach = (enemy: EnemyView) => {
    let cells = farReach.get(enemy);
    if (cells) return cells;
    cells = [];
    if (hasRoads && !isFlyingType(enemy.type)) {
      const { cost } = findCheapestPaths(grid(), enemy, enemy.move);
      for (const key of cost.keys()) {
        const cell = fromKey(key, width);
        if (manhattan(enemy, cell) > enemy.move) cells.push(cell);
      }
    }
    farReach.set(enemy, cells);
    return cells;
  };
  /**
   * Дотянется ли враг до клетки в свой ход: по прямой на `move` (как
   * раньше, без учёта местности) или по известным дорогам. Полёт —
   * только по прямой.
   */
  const reaches = (enemy: EnemyView, p: Position, range = enemy.range) => {
    const distance = manhattan(enemy, p);
    if (distance <= enemy.move + range) return true;
    // Дешевле дороги (0.5) клетки нет: дальше двойного хода не дойти.
    if (distance > enemy.move * 2 + range) return false;
    return roadReach(enemy).some(cell => manhattan(cell, p) <= range);
  };
  const strikes = new Set(obs.strikes.map(({ x, y }) => cellKey(x, y, width)));
  const struck = ({ x, y }: Position) => strikes.has(cellKey(x, y, width));
  const strikeThreat = MILITARY_UNITS_CONFIG.siege.attack;
  const memo = new Map<string, number>();
  const sumThreat = (p: Position, target?: UnitType) =>
    threats.reduce(
      (sum, enemy) =>
        reaches(enemy, p) && (!target || canHitTarget(enemy.type, target))
          ? sum + enemy.attack * enemy.certainty
          : sum,
      // Удар осады воздух не задевает.
      struck(p) && (!target || !isFlyingType(target)) ? strikeThreat : 0,
    );
  const threatAt = (p: Position, target?: UnitType) => {
    const key = `${p.x},${p.y},${target ?? ''}`;
    let value = memo.get(key);
    if (value === undefined) memo.set(key, (value = sumThreat(p, target)));
    return value;
  };
  return { threatAt, struck, reaches };
};
