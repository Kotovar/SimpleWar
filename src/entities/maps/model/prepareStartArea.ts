import { useMapStore } from './mapStore';

export const prepareStartArea = (x: number, y: number, size = 3) => {
  const setCell = useMapStore.getState().setCell;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cellX = x - 1 + j;
      const cellY = y - 1 + i;

      setCell(cellX, cellY, { type: 'grass', isWalkable: true });
    }
  }
};
