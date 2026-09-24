import { useMapStore } from './mapStore';

/**
 * Превращает в проходимую траву квадрат 3 × 3 вокруг стартовой клетки.
 *
 * @param x - Столбец центра квадрата.
 * @param y - Строка центра квадрата.
 */
export const prepareStartArea = (x: number, y: number) => {
  const { setCell } = useMapStore.getState();

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      setCell(x + dx, y + dy, { type: 'grass', isWalkable: true });
    }
  }
};
