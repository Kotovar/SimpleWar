import type { Cell } from './types';

export const setBasePlayer = (grid: Cell[][], buildingId: string) => {
  const size = grid.length;
  if (size < 3) return;

  // Окружение базы игрока травой
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i >= size || j >= size) continue;

      if (i === 1 && j === 1) continue;

      grid[i][j] = {
        ...grid[i][j],
        type: 'grass',
        isWalkable: true,
      };
    }
  }

  // Установка базы игрока
  grid[1][1] = {
    ...grid[1][1],
    buildingId,
    type: 'grass',
    isWalkable: false,
  };
};

export const setBaseComputer = (
  grid: Cell[][],
  size: number,
  buildingId: string,
) => {
  if (size < 3) return;

  // Окружение базы компьютера травой
  for (let i = size - 3; i < size; i++) {
    for (let j = size - 3; j < size; j++) {
      if (i === size - 2 && j === size - 2) continue;

      grid[i][j] = {
        ...grid[i][j],
        type: 'grass',
        isWalkable: true,
      };
    }
  }

  // Установка базы компьютера
  const baseX = size - 2;
  const baseY = size - 2;

  grid[baseY][baseX] = {
    ...grid[baseY][baseX],
    buildingId,
    type: 'grass',
    isWalkable: false,
  };
};
