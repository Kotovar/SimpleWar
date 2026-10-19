import { useMemo } from 'react';
import { useHighlightStore } from '@features/pathfinding';

/**
 * Клетки «работы» выбранного рабочего: стройка или расчистка леса.
 * Рисуются и подсказываются курсором одинаково.
 */
export const useProduceCells = () => {
  const buildableCells = useHighlightStore(state => state.buildableCells);
  const clearableCells = useHighlightStore(state => state.clearableCells);

  return useMemo(
    () =>
      buildableCells || clearableCells
        ? [...(buildableCells ?? []), ...(clearableCells ?? [])]
        : null,
    [buildableCells, clearableCells],
  );
};
