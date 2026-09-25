import type { ParticipantId } from './gameLoop';

/** Владелец юнита или здания — участник партии. */
export type Owner = ParticipantId;

/** Тип местности клетки. */
export type CellType = 'grass' | 'mountain' | 'water' | 'forest' | 'gold';

/** Координаты на карте. */
export type Position = {
  x: number;
  y: number;
};

/** Клетка карты с координатами, типом местности и проходимостью. */
export type Cell = Position & {
  type: CellType;
  isWalkable: boolean;
};
