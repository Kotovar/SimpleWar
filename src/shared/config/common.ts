import type { ParticipantId } from './gameLoop';

/** Владелец юнита или здания — участник партии. */
export type Owner = ParticipantId;

/** Тип местности клетки. */
export type CellType =
  | 'grass'
  | 'hill'
  | 'swamp'
  | 'mountain'
  | 'water'
  | 'forest'
  | 'gold';

/** Координаты на карте. */
export type Position = {
  x: number;
  y: number;
};

/**
 * Клетка карты с координатами, типом местности и проходимостью.
 * `road` — дорога: ничья, удешевляет наземный ход.
 */
export type Cell = Position & {
  type: CellType;
  isWalkable: boolean;
  road?: true;
  /** Богатая жила: только у золота, открывается разведчиком. */
  rich?: true;
};
