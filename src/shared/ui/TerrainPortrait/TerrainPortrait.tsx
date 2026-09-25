import { useEffect, useRef } from 'react';
import { GRID, type Cell, type CellType } from '@shared/config';
import { renderHiDpiCanvas } from '@shared/lib';
import { drawForest } from './drawForest';
import { drawGoldOre, drawMountains } from './drawTerrain';
import styles from './styles.module.css';

const rgb = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `rgb(${r}, ${g}, ${b})`;

const GROUND: Record<CellType, string> = {
  grass: rgb(GRID.colorGrass),
  forest: GRID.colorForestFloor,
  mountain: GRID.colorRockFloor,
  gold: GRID.colorRockFloor,
  water: rgb(GRID.colorWater),
};

const drawWater = (ctx: CanvasRenderingContext2D) => {
  // Мелководье по краям и пара бликов, как у водоёма на карте.
  const shallow = ctx.createRadialGradient(16, 16, 8, 16, 16, 23);
  shallow.addColorStop(0, 'rgba(150, 214, 245, 0)');
  shallow.addColorStop(1, GRID.colorWaterShallow);
  ctx.fillStyle = shallow;
  ctx.fillRect(0, 0, 32, 32);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(226, 240, 255, 0.35)';
  for (const [x, y, r] of [
    [11, 14, 5],
    [21, 21, 4],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
};

const drawGrass = (ctx: CanvasRenderingContext2D) => {
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = '#478b43';
  ctx.beginPath();
  for (const [x, y] of [
    [9, 13],
    [21, 20],
    [12, 25],
  ]) {
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x - 3.5, y - 3);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 4);
    ctx.moveTo(x + 1.5, y);
    ctx.lineTo(x + 3, y - 2.5);
  }
  ctx.stroke();
};

type Props = {
  cell: Cell;
  size?: number;
};

/** Показывает клетку с тем же вариантом рисунка, что и на карте. */
export const TerrainPortrait = ({ cell, size = 48 }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { x, y, type } = cell;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    return renderHiDpiCanvas(canvas, size, ctx => {
      ctx.fillStyle = GROUND[type];
      ctx.fillRect(0, 0, size, size);

      ctx.save();
      ctx.scale(size / 32, size / 32);
      if (type === 'water') drawWater(ctx);
      if (type === 'grass') drawGrass(ctx);
      ctx.restore();

      // Рисунок клетки берёт вариант из её координат: сдвигаем холст так,
      // чтобы клетка (x, y) оказалась в начале координат.
      ctx.save();
      ctx.translate(-x * size, -y * size);
      if (type === 'forest') drawForest(ctx, x, y, size);
      if (type === 'mountain') drawMountains(ctx, x, y, size);
      if (type === 'gold') drawGoldOre(ctx, x, y, size);
      ctx.restore();
    });
  }, [size, type, x, y]);

  return (
    <canvas
      ref={ref}
      className={styles.Portrait}
      style={{ width: size, height: size }}
      aria-hidden='true'
    />
  );
};
