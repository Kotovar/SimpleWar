import { RefObject, useCallback, useEffect, useMemo } from 'react';
import { useSettingsSelectors } from '@entities/settings';
import { useBuildingsSelectors } from '@entities/buildings';
import { useUnitsSelectors } from '@entities/units';
import { useMapSelectors } from '@entities/maps';
import type { Position } from '@shared/config';
import type { Selection } from '@features/selection';
import {
  createMovementPFGrid,
  getPath,
  useHighlightSelectors,
  useMovementSelectors,
} from '@features/pathfinding';
import {
  renderMovementLayer,
  renderSelectionLayer,
  renderTerrainLayer,
  withClear,
} from '@widgets/map/lib';
import { animatePulse } from './animatePulse';
import { setupCanvas } from './getCtx';
import { useDevicePixelRatio } from './useDevicePixelRatio';
import { useEntitiesLayer } from './useEntitiesLayer';

type Props = {
  selection: Selection;
  hover: Position | null;
  terrainRef: RefObject<HTMLCanvasElement | null>;
  unitsRef: RefObject<HTMLCanvasElement | null>;
  movementRef: RefObject<HTMLCanvasElement | null>;
  highlightRef: RefObject<HTMLCanvasElement | null>;
};

/**
 * Обновляет слои карты при смене данных, масштаба или плотности экрана.
 *
 * @param props.selection - Выделение для верхнего слоя.
 * @param props.hover - Клетка под курсором.
 * @param props.terrainRef - Холст рельефа.
 * @param props.unitsRef - Холст сущностей и их анимаций.
 * @param props.movementRef - Холст доступных действий.
 * @param props.highlightRef - Холст выделения и маршрута.
 */
export const useRenderFunctions = ({
  selection,
  hover,
  terrainRef,
  unitsRef,
  movementRef,
  highlightRef,
}: Props) => {
  const { grid } = useMapSelectors();
  const { buildings } = useBuildingsSelectors();
  const { units } = useUnitsSelectors();
  const { attackableTargets, reachableCells } = useMovementSelectors();
  const { spawnableCells, buildableCells } = useHighlightSelectors();
  const { cellSize, gridColumns, canvasWidth, canvasHeight } =
    useSettingsSelectors();
  const pixelRatio = useDevicePixelRatio();

  useEntitiesLayer({
    ref: unitsRef,
    buildings,
    units,
    cellSize,
    width: canvasWidth,
    height: canvasHeight,
  });

  // Маршрут до клетки под курсором: показываем путь и цену до клика.
  const hoverPath = useMemo(() => {
    if (!hover || selection?.kind !== 'unit') return null;

    const unit = units[selection.id];
    const isReachable = reachableCells?.some(
      cell => cell.x === hover.x && cell.y === hover.y,
    );
    if (!unit || unit.owner !== 'player' || !isReachable) return null;

    const path = getPath(unit, hover, createMovementPFGrid(grid));

    return path.length > 1 ? path : null;
  }, [grid, hover, reachableCells, selection, units]);

  // Ключ меняется только при постройке или сносе, а не при каждом уроне
  // зданию: террейн не перерисовывается без нужды.
  const builtKey = Object.values(buildings)
    .map(({ x, y }) => `${x},${y}`)
    .sort()
    .join(';');
  const builtCells = useMemo(
    () => new Set(builtKey ? builtKey.split(';') : []),
    [builtKey],
  );

  const renderTerrain = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      withClear(ctx, () =>
        renderTerrainLayer(ctx, grid, cellSize, gridColumns, builtCells),
      );
    },
    [builtCells, cellSize, grid, gridColumns],
  );

  const renderMovement = useCallback(
    (ctx: CanvasRenderingContext2D, pulse: number) => {
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
      );
    },
    [
      attackableTargets,
      buildableCells,
      cellSize,
      reachableCells,
      spawnableCells,
    ],
  );

  const renderSelection = useCallback(
    (ctx: CanvasRenderingContext2D, pulse: number) => {
      withClear(ctx, () =>
        renderSelectionLayer(ctx, buildings, units, selection, cellSize, {
          hover,
          path: hoverPath,
          attackableTargets,
          pulse,
        }),
      );
    },
    [
      attackableTargets,
      buildings,
      cellSize,
      hover,
      hoverPath,
      selection,
      units,
    ],
  );

  useEffect(() => {
    const ctx = setupCanvas(terrainRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    renderTerrain(ctx);
  }, [canvasHeight, canvasWidth, pixelRatio, renderTerrain, terrainRef]);

  useEffect(() => {
    const ctx = setupCanvas(movementRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    // Пульсируют только цели атаки: без них слой рисуется один раз.
    return animatePulse(!!attackableTargets?.length, pulse =>
      renderMovement(ctx, pulse),
    );
  }, [
    attackableTargets,
    canvasHeight,
    canvasWidth,
    movementRef,
    pixelRatio,
    renderMovement,
  ]);

  useEffect(() => {
    const ctx = setupCanvas(highlightRef, canvasWidth, canvasHeight);
    if (!ctx) return;

    return animatePulse(!!selection, pulse => renderSelection(ctx, pulse));
  }, [
    canvasHeight,
    canvasWidth,
    highlightRef,
    pixelRatio,
    renderSelection,
    selection,
  ]);
};
