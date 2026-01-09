import { useBuildingsStore } from '@entities/buildings';
import type { Cell } from '@shared/config';

const { spawnBuilding } = useBuildingsStore.getState();

export const setBasePlayer = (grid: Cell[][]) => {
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

  spawnBuilding('base', 1, 1, 'player');
};

export const setBaseComputer = (grid: Cell[][], size: number) => {
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

  spawnBuilding('base', baseY, baseX, 'ai');
};
