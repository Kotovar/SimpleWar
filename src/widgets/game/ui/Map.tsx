import { useEffect, useRef } from 'react';
import { CANVAS_SIZE, CELL_SIZE, GRID_SIZE } from '@shared/config';
import {
  drawSwordsman,
  drawBackgroundAndGrid,
  drawBase,
  drawWater,
  drawForest,
  drawMountains,
  drawGoldOre,
} from './utils';
import { useMapStore } from '../model';

export const Map = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grid = useMapStore(state => state.grid);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawBackgroundAndGrid(ctx, CANVAS_SIZE, CELL_SIZE, GRID_SIZE);

    // Слои отрисовки
    // 1. Вода
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.type === 'water') drawWater(ctx, x, y, CELL_SIZE);
      }),
    );

    // 2. Горы
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.type === 'mountain') drawMountains(ctx, x, y, CELL_SIZE);
      }),
    );

    // 3. Лес + золото
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.type === 'forest') drawForest(ctx, x, y, CELL_SIZE);
        if (cell.type === 'gold') drawGoldOre(ctx, x, y, CELL_SIZE);
      }),
    );

    // 4. Здания
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.buildingId) drawBase(ctx, x, y, CELL_SIZE);
      }),
    );

    // 5. Юниты
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.unitId === 'swordsman') drawSwordsman(ctx, x, y, CELL_SIZE);
      }),
    );
  }, [grid]);

  return <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />;
};
