import clsx from 'clsx';
import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { useSettingsSelectors } from '@entities/settings';
import { useMovementSelectors } from '@features/pathfinding';
import { useSelectionSelectors } from '@features/selection';
import { useRenderFunctions } from './utils';
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

  const { canvasWidth, canvasHeight } = useSettingsSelectors();
  const { reachableCells } = useMovementSelectors();
  const { selection } = useSelectionSelectors();
  const { activePlayer, phase } = useGameLoopSelectors();

  const CANVAS_SIZES = {
    width: canvasWidth,
    height: canvasHeight,
  };

  useRenderFunctions({
    selection,
    reachableCells,
    terrainRef,
    unitsRef,
    movementRef,
    highlightRef,
  });

  return (
    <>
      <canvas
        className={clsx(styles.CanvasLayer, styles.Terrain)}
        ref={terrainRef}
        {...CANVAS_SIZES}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Unit)}
        ref={unitsRef}
        {...CANVAS_SIZES}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Movement)}
        ref={movementRef}
        {...CANVAS_SIZES}
      />

      <canvas
        className={clsx(styles.CanvasLayer, styles.Highlight, {
          [styles.Pointer]: true,
          [styles.Move]: selection?.kind === 'unit',
          [styles.Building]: selection?.kind === 'building',
        })}
        ref={highlightRef}
        onClick={
          phase === 'inProgress' && activePlayer === 'player'
            ? e => handleClick(e, highlightRef.current)
            : undefined
        }
        {...CANVAS_SIZES}
      />
    </>
  );
};
