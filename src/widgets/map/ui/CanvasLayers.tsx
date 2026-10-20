import clsx from 'clsx';
import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import type { Owner, Position, UnitOrder } from '@shared/config';
import { audio, collectStrikeMarks } from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore, useParticipantStyles } from '@entities/games';
import { usePreferencesStore } from '@entities/settings';
import { useSelectionStore } from '@features/selection';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import { getPlacementRejection } from '@features/build';
import { getContextWorkplace } from '@features/workers';
import {
  drawWorldEdge,
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
  useProduceCells,
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
  onCellClick: (cell: Position, order?: boolean) => void;
};

export const CanvasLayers = ({ scene, humanId, onCellClick }: Props) => {
  const teams = useParticipantStyles();
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
  const strikeCells = useHighlightStore(state => state.strikeCells);
  const healTargets = useMovementStore(state => state.healTargets);
  const plannedTarget = useMovementStore(state => state.plannedTarget);
  const produceCells = useProduceCells();
  const placing = useBuildingsStore(state => state.selectedBuildingForSpawn);
  // Места стройки не заливаются: их слишком много, годность видна по
  // призраку под курсором. Подсветка остаётся у расчистки.
  const buildableCells = placing ? null : produceCells;
  const placeCells = useHighlightStore(state => state.buildableCells);
  const fogQuality = usePreferencesStore(state => state.fogQuality);

  const canOrder = phase === 'inProgress' && activePlayer === humanId;
  const isInteractive = canOrder || phase === 'gameOver';
  const { hover, cursor, onMouseMove, onMouseLeave } = useHoverCell(
    view,
    isInteractive,
  );

  const { fog, grid, units, buildings, snapshots } = scene;
  // Отметки ударов — из знаний смотрящего (Скрытая наводка прячет чужие),
  // в полном обзоре отладки — все.
  const strikeMarks = useMemo(
    () =>
      fog
        ? Object.values(fog.strikes)
        : collectStrikeMarks(Object.values(worldUnits)),
    [fog, worldUnits],
  );
  const columns = grid[0]?.length ?? 0;
  const mapSize = useMemo(
    () => ({ columns, rows: grid.length }),
    [columns, grid.length],
  );
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
    strikeMarks,
  });

  // Выбор озвучивается откликом; снятие выбора — тишиной.
  useEffect(() => {
    if (selection) audio.play('select');
  }, [selection]);

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
      if (fog) renderFogLayer(ctx, fog, cellSize, range, fogQuality);
      drawWorldEdge(ctx, mapSize.columns, mapSize.rows, cellSize);
    });
  }, [fog, fogQuality, mapSize, view]);

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
          mapSize,
          strikeCells,
          strikeMarks,
          healTargets,
        ),
      ),
    );
  }, [
    attackableTargets,
    buildableCells,
    mapSize,
    reachableCells,
    spawnableCells,
    strikeCells,
    strikeMarks,
    healTargets,
    view,
  ]);

  // Режим выбора места: здание-призрак под курсором и путь рабочего к нему.
  const ghost = useMemo(() => {
    if (!canOrder || !placing || !hover || !humanId) return null;
    if (hover.x < 0 || hover.y < 0) return null;
    if (hover.x >= mapSize.columns || hover.y >= mapSize.rows) return null;
    const worker = selection?.kind === 'unit' ? worldUnits[selection.id] : null;
    // Кандидаты дешёвые (местность и путь); проход — только под курсором.
    const valid =
      !!worker &&
      !!placeCells?.some(({ x, y }) => x === hover.x && y === hover.y) &&
      !getPlacementRejection(worker, humanId, placing, hover);
    return { ...hover, type: placing, owner: humanId, valid };
    // Здания читает проверка места из стора: при их смене — пересчёт.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canOrder,
    hover,
    humanId,
    mapSize,
    placeCells,
    placing,
    selection,
    worldBuildings,
    worldUnits,
  ]);

  const clearableCells = useHighlightStore(state => state.clearableCells);
  const roadCells = useHighlightStore(state => state.roadCells);
  // Какой приказ даст клик под курсором: путь к нему виден до клика.
  // Прицел, расчистка и дорога не ведут юнит: пути нет.
  const hoverOrder = useMemo((): UnitOrder | false | null => {
    if (strikeCells || clearableCells || roadCells) return false;
    if (ghost) {
      return ghost.valid
        ? { type: 'build', buildingType: ghost.type, x: ghost.x, y: ghost.y }
        : false;
    }
    if (!canOrder || !hover || !humanId || selection?.kind !== 'unit')
      return null;
    const worker = worldUnits[selection.id];
    const workplace = worker && getContextWorkplace(worker, humanId, hover);
    return workplace
      ? { type: 'work', buildingId: workplace.id, x: hover.x, y: hover.y }
      : null;
    // Здания читает getContextWorkplace из стора: при их смене — пересчёт.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canOrder,
    clearableCells,
    ghost,
    hover,
    roadCells,
    humanId,
    selection,
    strikeCells,
    worldBuildings,
    worldUnits,
  ]);

  // Прицел осады: дуга полёта камня к допустимой клетке под курсором.
  const strikeArc = useMemo(() => {
    if (!hover || selection?.kind !== 'unit') return null;
    const siege = worldUnits[selection.id];
    const aimed = strikeCells?.some(
      ({ x, y }) => x === hover.x && y === hover.y,
    );
    return siege && aimed
      ? { from: { x: siege.x, y: siege.y }, to: hover }
      : null;
  }, [hover, selection, strikeCells, worldUnits]);

  const hoverPath = useHoverPath(
    canOrder ? hover : null,
    selection,
    units,
    humanId,
    plannedTarget,
    hoverOrder,
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
          teams,
          hover,
          path: hoverPath,
          attackableTargets,
          healTargets,
          ghost,
          arc: strikeArc,
          showRallyPoint:
            !!humanId &&
            selection?.kind === 'building' &&
            buildings[selection.id]?.owner === humanId,
          pulse,
        }),
      ),
    );
  }, [
    attackableTargets,
    teams,
    buildings,
    ghost,
    healTargets,
    hover,
    hoverPath,
    strikeArc,
    humanId,
    selection,
    units,
    view,
  ]);

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onCellClick(
      view.cellAt({ x: event.clientX - box.left, y: event.clientY - box.top }),
      event.type === 'contextmenu',
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
        onContextMenu={event => {
          event.preventDefault();
          if (canOrder) handleClick(event);
        }}
        onMouseMove={isInteractive ? onMouseMove : undefined}
        onMouseLeave={onMouseLeave}
      />
    </>
  );
};
