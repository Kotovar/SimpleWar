import { useState, type MouseEvent } from 'react';
import type { Position } from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import type { MapView } from './useMapView';
import styles from '../styles.module.css';

const contains = (cells: Position[] | null, hover: Position) =>
  !!cells?.some(cell => cell.x === hover.x && cell.y === hover.y);

/**
 * Клетка под курсором и вид курсора: он показывает, что случится по клику.
 * Курсор строится только по подсветкам, уже отфильтрованным по обзору.
 *
 * @param view - Камера карты.
 * @param isInteractive - Сейчас ход человека и партия идёт.
 */
export const useHoverCell = (view: MapView, isInteractive: boolean) => {
  const [hover, setHover] = useState<Position | null>(null);
  const columns = useSettingsStore(state => state.gridColumns);
  const rows = useSettingsStore(state => state.gridRows);
  const reachableCells = useMovementStore(state => state.reachableCells);
  const attackableTargets = useMovementStore(state => state.attackableTargets);
  const spawnableCells = useHighlightStore(state => state.spawnableCells);
  const buildableCells = useHighlightStore(state => state.buildableCells);

  const cursor = (() => {
    if (!isInteractive || !hover) return styles.CursorIdle;
    if (contains(attackableTargets, hover)) return styles.CursorAttack;
    if (contains(buildableCells, hover) || contains(spawnableCells, hover)) {
      return styles.CursorBuild;
    }
    if (contains(reachableCells, hover)) return styles.CursorMove;
    return styles.CursorSelect;
  })();

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const { x, y } = view.cellAt({
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    });
    const isOutside = x < 0 || x >= columns || y < 0 || y >= rows;

    setHover(current => {
      if (isOutside) return null;
      return current?.x === x && current?.y === y ? current : { x, y };
    });
  };

  return {
    hover: isInteractive ? hover : null,
    cursor,
    onMouseMove,
    onMouseLeave: () => setHover(null),
  };
};
