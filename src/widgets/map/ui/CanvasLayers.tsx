import clsx from 'clsx';
import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import type { Owner, Position } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { useSelectionStore } from '@features/selection';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import {
  renderFogLayer,
  renderMovementLayer,
  renderSelectionLayer,
  withClear,
  type Scene,
} from '@widgets/map/lib';
import { animatePulse } from './utils/animatePulse';
import {
  setupCanvas,
  useEntitiesLayer,
  useBuiltCells,
  useHoverCell,
  useHoverPath,
  useMapView,
  drawCachedTerrain,
  type TerrainCache,
} from './utils';
import styles from './styles.module.css';

type Props = {
  /** Разрешённые смотрящему объекты и местность. */
  scene: Scene;
  /** Участник за этим экраном. */
  humanId: Owner | null;
  /** Клик по клетке мира; координаты могут быть вне карты. */
  onCellClick: (cell: Position) => void;
};

export const CanvasLayers = ({ scene, humanId, onCellClick }: Props) => {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const unitsRef = useRef<HTMLCanvasElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  const movementRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef<HTMLCanvasElement>(null);

  const view = useMapView();
  const worldUnits = useUnitsStore(state => state.units);
  const worldBuildings = useBuildingsStore(state => state.buildings);
  const phase = useGameLoopStore(state => state.phase);
  const activePlayer = useGameLoopStore(state => state.activePlayer);
  const selection = useSelectionStore(state => state.selection);
  const reachableCells = useMovementStore(state => state.reachableCells);
  const attackableTargets = useMovementStore(state => state.attackableTargets);
  const spawnableCells = useHighlightStore(state => state.spawnableCells);
  const buildableCells = useHighlightStore(state => state.buildableCells);

  const isInteractive = phase === 'inProgress' && activePlayer === humanId;
  const { hover, cursor, onMouseMove, onMouseLeave } = useHoverCell(
    view,
    isInteractive,
  );

  const { fog, grid, units, buildings, snapshots } = scene;
  const worldIds = useMemo(
    () => new Set([...Object.keys(worldUnits), ...Object.keys(worldBuildings)]),
    [worldBuildings, worldUnits],
  );
  const isVisible = useMemo(
    () => (x: number, y: number) =>
      !fog || fog.visible[y * fog.width + x] === 1,
    [fog],
  );

  useEntitiesLayer({
    ref: unitsRef,
    scene,
    worldIds,
    isVisible,
    humanId,
    view,
  });

  const builtCells = useBuiltCells([...Object.values(buildings), ...snapshots]);

  const terrainCache = useRef<TerrainCache | null>(null);
  useEffect(() => {
    const { cellSize, viewport, offset, range } = view;
    const ctx = setupCanvas(
      terrainRef,
      viewport.width,
      viewport.height,
      offset,
    );
    if (!ctx) return;

    terrainCache.current = drawCachedTerrain(
      ctx,
      terrainCache.current,
      grid,
      builtCells,
      cellSize,
      range,
    );
  }, [builtCells, grid, view]);

  useEffect(() => {
    const { cellSize, viewport, offset, range } = view;
    const ctx = setupCanvas(fogRef, viewport.width, viewport.height, offset);
    if (!ctx) return;

    withClear(ctx, () => {
      if (fog) renderFogLayer(ctx, fog, cellSize, range);
    });
  }, [fog, view]);

  useEffect(() => {
    const { cellSize, viewport, offset } = view;
    const ctx = setupCanvas(
      movementRef,
      viewport.width,
      viewport.height,
      offset,
    );
    if (!ctx) return;

    // Пульсируют только цели атаки: без них слой рисуется один раз.
    return animatePulse(!!attackableTargets?.length, pulse =>
      withClear(ctx, () =>
        renderMovementLayer(
          ctx,
          reachableCells,
          attackableTargets,
          buildableCells,
          spawnableCells,
          cellSize,
          pulse,
        ),
      ),
    );
  }, [attackableTargets, buildableCells, reachableCells, spawnableCells, view]);

  const hoverPath = useHoverPath(
    hover,
    selection,
    units,
    reachableCells,
    humanId,
  );

  useEffect(() => {
    const { cellSize, viewport, offset } = view;
    const ctx = setupCanvas(
      highlightRef,
      viewport.width,
      viewport.height,
      offset,
    );
    if (!ctx) return;

    return animatePulse(!!selection, pulse =>
      withClear(ctx, () =>
        renderSelectionLayer(ctx, buildings, units, selection, cellSize, {
          hover,
          path: hoverPath,
          attackableTargets,
          pulse,
        }),
      ),
    );
  }, [attackableTargets, buildings, hover, hoverPath, selection, units, view]);

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onCellClick(
      view.cellAt({ x: event.clientX - box.left, y: event.clientY - box.top }),
    );
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
      <canvas className={clsx(styles.CanvasLayer, styles.Fog)} ref={fogRef} />
      <canvas
        className={clsx(styles.CanvasLayer, styles.Movement)}
        ref={movementRef}
      />
      <canvas
        className={clsx(styles.CanvasLayer, styles.Highlight, cursor)}
        ref={highlightRef}
        onClick={isInteractive ? handleClick : undefined}
        onMouseMove={isInteractive ? onMouseMove : undefined}
        onMouseLeave={onMouseLeave}
      />
    </>
  );
};
