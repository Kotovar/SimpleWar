import { useEffect, useRef, useState } from 'react';
import { generateMap, randomSeed } from '@entities/maps';
import { renderTerrainLayer } from '@widgets/map';
import styles from './styles.module.css';

/** Размер клетки фона, CSS px: крупнее игрового, чтобы рисунок читался. */
const CELL = 44;

/**
 * Фон главного меню: случайный рельеф без юнитов и зданий, чтобы настройка
 * сторон не меняла картинку.
 */
export const MenuBackdrop = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [seed] = useState(randomSeed);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Запас по краям — под дрейф и масштаб анимации.
    const columns = Math.min(100, Math.ceil((innerWidth * 1.2) / CELL) + 2);
    const rows = Math.min(100, Math.ceil((innerHeight * 1.2) / CELL) + 2);
    const grid = generateMap(columns, rows, seed);
    const ratio = Math.min(2, devicePixelRatio || 1);
    canvas.width = columns * CELL * ratio;
    canvas.height = rows * CELL * ratio;
    canvas.style.width = `${columns * CELL}px`;
    canvas.style.height = `${rows * CELL}px`;
    ctx.scale(ratio, ratio);
    renderTerrainLayer(ctx, grid, CELL, columns);
  }, [seed]);

  return (
    <div className={styles.Backdrop} aria-hidden>
      <canvas ref={ref} />
    </div>
  );
};
