import { useMemo } from 'react';
import { useHighlightStore } from '@features/pathfinding';

/**
 * Клетки «работы» выбранного рабочего: стройка, расчистка леса или дорога.
 * Рисуются и подсказываются курсором одинаково.
 */
export const useProduceCells = () => {
  const buildableCells = useHighlightStore(state => state.buildableCells);
  const clearableCells = useHighlightStore(state => state.clearableCells);
  const roadCells = useHighlightStore(state => state.roadCells);

  return useMemo(
    () =>
      buildableCells || clearableCells || roadCells
        ? [
            ...(buildableCells ?? []),
            ...(clearableCells ?? []),
            ...(roadCells ?? []),
          ]
        : null,
    [buildableCells, clearableCells, roadCells],
  );
};
