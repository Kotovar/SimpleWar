import { useEffect, useRef } from 'react';
import type { Cell, Owner } from '@shared/config';
import {
  drawArcher,
  drawBarracks,
  drawBase,
  drawRider,
  drawSwordsman,
  drawTower,
  drawWorker,
} from '@shared/ui';
import { generateMap } from '@entities/maps';
import { renderTerrainLayer } from '@widgets/map';
import styles from './styles.module.css';

/** Размер клетки фона, CSS px: крупнее игрового, чтобы рисунок читался. */
const CELL = 44;

type Draw = typeof drawBase;

/** Две базы с охраной: левая — игрока, правая — противника. */
const CAMPS: { owner: Owner; at: number; entities: Draw[] }[] = [
  {
    owner: 'p1',
    at: 0.13,
    entities: [drawBase, drawBarracks, drawSwordsman, drawArcher, drawWorker],
  },
  {
    owner: 'p2',
    at: 0.87,
    entities: [drawBase, drawTower, drawRider, drawSwordsman, drawArcher],
  },
];

/** Ближайшие к точке клетки травы по спирали квадратов. */
const grassAround = (grid: Cell[][], cx: number, cy: number, count: number) => {
  const found: Cell[] = [];
  for (let r = 0; r < 8 && found.length < count; r++) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r) continue;
        const cell = grid[y]?.[x];
        if (cell?.type === 'grass' && found.length < count) found.push(cell);
      }
    }
  }
  return found;
};

/**
 * Фон главного меню: случайная карта с двумя лагерями, медленно плывёт под
 * затемнением. Рисуется один раз на открытие меню тем же кодом, что и карта.
 */
export const MenuBackdrop = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Запас по краям — под дрейф и масштаб анимации.
    const columns = Math.min(100, Math.ceil((innerWidth * 1.2) / CELL) + 2);
    const rows = Math.min(100, Math.ceil((innerHeight * 1.2) / CELL) + 2);
    const grid = generateMap(columns, rows);
    const ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = columns * CELL * ratio;
    canvas.height = rows * CELL * ratio;
    canvas.style.width = `${columns * CELL}px`;
    canvas.style.height = `${rows * CELL}px`;
    ctx.scale(ratio, ratio);
    renderTerrainLayer(ctx, grid, CELL, columns);
    for (const camp of CAMPS) {
      const cells = grassAround(
        grid,
        Math.round(columns * camp.at),
        Math.round(rows * 0.5),
        camp.entities.length,
      );
      cells.forEach((cell, index) =>
        camp.entities[index](ctx, cell.x, cell.y, CELL, camp.owner),
      );
    }
  }, []);

  return (
    <div className={styles.Backdrop} aria-hidden>
      <canvas ref={ref} />
    </div>
  );
};
