import {
  BUILDINGS_CONFIG,
  BUILDINGS_NAME,
  SIEGE_STRIKE,
  UNITS_NAME,
  type BuildingType,
  type CellType,
  type UnitType,
} from '@shared/config';

/** Где искать клетку для зданий с особым требованием к местности. */
const PLACE: Partial<Record<CellType, string>> = {
  gold: ' на золотой жиле',
  forest: ' в лесу',
};

/** Включённый режим карты и сколько клеток в нём подсвечено. */
export type MapMode =
  | { kind: 'build'; type: BuildingType; cells: number }
  | { kind: 'spawn'; type: UnitType; cells: number }
  | { kind: 'clear'; cells: number }
  | { kind: 'strike'; cells: number }
  /** Далёкая цель отмечена первым кликом. */
  | { kind: 'goto' };

/**
 * Подсказка следующего шага во включённом режиме карты: куда кликнуть
 * или почему подсвеченных клеток нет. Отмена — `Esc` или кнопка режима.
 *
 * @param mode - Режим и число подсвеченных клеток.
 */
export const getModePrompt = (mode: MapMode) => {
  switch (mode.kind) {
    case 'build': {
      const place =
        PLACE[BUILDINGS_CONFIG[mode.type].requiredField ?? 'grass'] ?? '';
      return mode.cells
        ? `Кликните по подсвеченной клетке${place}, чтобы построить «${BUILDINGS_NAME[mode.type]}».`
        : `Рядом с рабочим нет свободной клетки${place}, где здание не перекроет последний проход.`;
    }
    case 'spawn':
      return mode.cells
        ? `Кликните по подсвеченной клетке рядом со зданием, чтобы нанять «${UNITS_NAME[mode.type]}».`
        : 'Вокруг здания нет свободной клетки для нового юнита.';
    case 'clear':
      return mode.cells
        ? 'Кликните по подсвеченному лесу: клетка станет полем.'
        : 'Рядом нет видимого свободного леса.';
    case 'strike':
      return mode.cells
        ? `Кликните по клетке в ${SIEGE_STRIKE.minRange}–${SIEGE_STRIKE.maxRange} клетках: удар — в начале вашего следующего хода.`
        : 'В дальности удара нет разведанных клеток.';
    case 'goto':
      return 'Нажмите ПКМ по отмеченной клетке ещё раз, чтобы отдать приказ «Идти в точку».';
  }
};
