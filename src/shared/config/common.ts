export type Owner = 'player' | 'enemy';

export type CellType = 'grass' | 'mountain' | 'water' | 'forest' | 'gold';

export type Cell = {
  x: number;
  y: number;
  type: CellType;
  isWalkable: boolean;
};
