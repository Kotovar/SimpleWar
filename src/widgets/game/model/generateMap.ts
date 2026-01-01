import { createNoise2D } from 'simplex-noise';
import { setBaseComputer, setBasePlayer } from './generateStartBases';
import type { Cell, CellType } from './types';

export const generateInitialMap = (size: number, seed?: number): Cell[][] => {
  const grid: Cell[][] = [];

  const noise2D = createNoise2D(() => seed ?? Math.random());

  const featureScale = size / 2;
  const detailScale = size / 3;

  for (let y = 0; y < size; y++) {
    grid[y] = [];
    for (let x = 0; x < size; x++) {
      const mainValue = noise2D(x / featureScale, y / featureScale);
      const detailValue = noise2D(x / detailScale, y / detailScale) * 0.3;

      const totalValue = mainValue + detailValue;

      let type: CellType;
      let isWalkable: boolean;

      if (totalValue < -0.5) {
        type = 'water';
        isWalkable = false;
      } else if (totalValue > 0.75) {
        type = 'mountain';
        isWalkable = false;
      } else if (totalValue > 0.65) {
        type = 'forest';
        isWalkable = false;
      } else if (totalValue > 0.6) {
        type = 'gold';
        isWalkable = false;
      } else {
        type = 'grass';
        isWalkable = true;
      }

      grid[y][x] = {
        x,
        y,
        type,
        isWalkable,
        unitId: null,
        buildingId: null,
      };
    }
  }

  setBasePlayer(grid, 'player-base-1');
  setBaseComputer(grid, size, 'ai-base-1');

  return grid;
};
