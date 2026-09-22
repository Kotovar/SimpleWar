import clsx from 'clsx';
import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Position } from '@shared/config';
import { useSettingsSelectors } from '@entities/settings';
import { useSelectionSelectors } from '@features/selection';
import {
  useHighlightSelectors,
  useMovementSelectors,
} from '@features/pathfinding';
import { getGridCoordsFromEvent, useRenderFunctions } from './utils';
import styles from './styles.module.css';
import { useGameLoopSelectors } from '@features/game-loop';

type Props = {
  handleClick: (
    e: MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null,
  ) => void;
};

export const CanvasLayers = ({ handleClick }: Props) => {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const unitsRef = useRef<HTMLCanvasElement>(null);
  const movementRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef<HTMLCanvasElement>(null);

  const { gridColumns, gridRows, cellSize } = useSettingsSelectors();
  const { selection } = useSelectionSelectors();
  const { activePlayer, phase } = useGameLoopSelectors();
  const [hover, setHover] = useState<Position | null>(null);

  const { reachableCells, attackableTargets } = useMovementSelectors();
  const { spawnableCells, buildableCells } = useHighlightSelectors();

  const isInteractive = phase === 'inProgress' && activePlayer === 'player';

  // Курсор показывает, что случится по клику именно в этой клетке.
  const contains = (cells: Position[] | null) =>
    !!hover && !!cells?.some(cell => cell.x === hover.x && cell.y === hover.y);

  const getCursor = () => {
    if (!isInteractive || !hover) return styles.CursorIdle;
    if (contains(attackableTargets)) return styles.CursorAttack;
    if (contains(buildableCells) || contains(spawnableCells)) {
      return styles.CursorBuild;
    }
    if (contains(reachableCells)) return styles.CursorMove;

    return styles.CursorSelect;
  };

  useRenderFunctions({
    selection,
    hover: isInteractive ? hover : null,
    terrainRef,
    unitsRef,
    movementRef,
    highlightRef,
  });

  const handleMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = highlightRef.current;
    if (!canvas) return;

    const { x, y } = getGridCoordsFromEvent(event, canvas, cellSize);
    const isOutside = x < 0 || x >= gridColumns || y < 0 || y >= gridRows;

    setHover(current => {
      if (isOutside) return null;

      return current?.x === x && current?.y === y ? current : { x, y };
    });
  };

  return (
    <>
      <canvas
        className={clsx(styles.CanvasLayer, styles.Terrain)}
        ref={terrainRef}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Unit)}
        ref={unitsRef}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Movement)}
        ref={movementRef}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Highlight, getCursor())}
        ref={highlightRef}
        onClick={
          isInteractive ? e => handleClick(e, highlightRef.current) : undefined
        }
        onMouseMove={isInteractive ? handleMove : undefined}
        onMouseLeave={() => setHover(null)}
      />
    </>
  );
};
