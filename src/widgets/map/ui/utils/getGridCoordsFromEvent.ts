/**
 * Переводит позицию указателя в координаты клетки холста.
 *
 * @param event - Экранная позиция указателя.
 * @param canvas - Холст с размерами и положением карты.
 * @param cellSize - Размер клетки в CSS-пикселях.
 * @returns Координаты клетки; за пределами холста они могут быть отрицательными.
 */
export const getGridCoordsFromEvent = (
  event: Pick<MouseEvent, 'clientX' | 'clientY'>,
  canvas: HTMLCanvasElement,
  cellSize: number,
) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  return {
    x: Math.floor(clickX / cellSize),
    y: Math.floor(clickY / cellSize),
  };
};
