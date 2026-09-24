/** Владелец юнита или здания. */
export type Owner = 'player' | 'ai';

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
