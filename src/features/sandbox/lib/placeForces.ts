import {
  BUILDINGS_CONFIG,
  type Cell,
  type Position,
  type SandboxBuildingType,
  type SandboxSide,
  type UnitType,
} from '@shared/config';
import { isBuildableTerrain, isFlyingType } from '@shared/lib';

/** Что и куда поставить; `skipped` — не нашлось подходящей клетки. */
export type Placement = {
  buildings: { type: SandboxBuildingType; x: number; y: number }[];
  units: { type: UnitType; x: number; y: number }[];
  skipped: string[];
};

const distance = (a: Position, b: Position) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Самая большая связная область проходимых свободных клеток: наземный юнит
 * вне её заперт зданиями или водой и в бою не участвует.
 */
const mainland = (grid: Cell[][], taken: Set<string>) => {
  let best = new Set<Cell>();
  const seen = new Set<Cell>();
  const passable = (cell?: Cell) =>
    !!cell && cell.isWalkable && !taken.has(`${cell.x},${cell.y}`);
  for (const start of grid.flat()) {
    if (seen.has(start) || !passable(start)) continue;
    const area = new Set([start]);
    seen.add(start);
    for (const { x, y } of area) {
      for (const next of [
        grid[y - 1]?.[x],
        grid[y + 1]?.[x],
        grid[y]?.[x - 1],
        grid[y]?.[x + 1],
      ]) {
        if (passable(next) && !seen.has(next!)) {
          seen.add(next!);
          area.add(next!);
        }
      }
    }
    if (area.size > best.size) best = area;
  }
  return best;
};

/**
 * Воспроизводимая расстановка стороны у её ратуши: одинаковые карта и
 * сценарий дают одинаковый результат. Здания — через клетку (шахматный
 * порядок оставляет проходы), на подходящей местности; рудник и лесопилка —
 * на любой ближайшей клетке своего ресурса; юниты — на ближайших
 * свободных клетках: наземные — в общей проходимой области (не запертые
 * зданиями), летающие — на любых.
 *
 * @param grid - Карта.
 * @param taken - Занятые клетки `x,y`; дополняется поставленным.
 * @param base - Ратуша стороны.
 * @param side - Состав стороны.
 */
export const placeForces = (
  grid: Cell[][],
  taken: Set<string>,
  base: Position,
  side: Pick<SandboxSide, 'units' | 'buildings'>,
): Placement => {
  const cells = grid
    .flat()
    .sort(
      (a, b) => distance(a, base) - distance(b, base) || a.y - b.y || a.x - b.x,
    );
  const free = (cell: Cell) => !taken.has(`${cell.x},${cell.y}`);
  const take = (cell: Cell) => taken.add(`${cell.x},${cell.y}`);
  const result: Placement = { buildings: [], units: [], skipped: [] };

  for (const [type, count = 0] of Object.entries(side.buildings) as [
    SandboxBuildingType,
    number,
  ][]) {
    const required = BUILDINGS_CONFIG[type].requiredField;
    for (let i = 0; i < count; i++) {
      const cell = cells.find(
        c =>
          free(c) &&
          distance(c, base) >= 2 &&
          // Шахматный порядок — только на поле: клетки ресурса любые.
          (!!required && required !== 'grass'
            ? true
            : (c.x + c.y) % 2 === (base.x + base.y) % 2) &&
          isBuildableTerrain(required, c.type),
      );
      if (!cell) {
        result.skipped.push(type);
        continue;
      }
      take(cell);
      result.buildings.push({ type, x: cell.x, y: cell.y });
    }
  }

  const open = mainland(grid, taken);
  for (const [type, count = 0] of Object.entries(side.units) as [
    UnitType,
    number,
  ][]) {
    for (let i = 0; i < count; i++) {
      const cell = cells.find(
        c => free(c) && (isFlyingType(type) || open.has(c)),
      );
      if (!cell) {
        result.skipped.push(type);
        continue;
      }
      take(cell);
      result.units.push({ type, x: cell.x, y: cell.y });
    }
  }
  return result;
};
