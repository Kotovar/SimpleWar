import { useEffect, useRef, useState } from 'react';
import { generateMap, randomSeed } from '@entities/maps';
import { renderTerrainLayer } from '@widgets/map';
import styles from './styles.module.css';

/** Размер клетки фона, CSS px: крупнее игрового, чтобы рисунок читался. */
const CELL = 44;

/**
 * Фон главного меню: случайный рельеф без юнитов и зданий, чтобы настройка
 * сторон не меняла картинку. Карта шире окна и плавно проплывает (CSS).
 */
export const MenuBackdrop = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [seed] = useState(randomSeed);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Карта вдвое шире окна: фон проплывает её из стороны в сторону.
    const columns = Math.min(100, Math.ceil((innerWidth * 2) / CELL) + 2);
    const rows = Math.min(100, Math.ceil((innerHeight * 1.3) / CELL) + 2);
    const grid = generateMap(columns, rows, seed);
    const width = columns * CELL;
    const height = rows * CELL;
    // Фон затемнён: высокая плотность не нужна, а память канваса ограничена.
    const ratio = Math.min(
      1.5,
      devicePixelRatio || 1,
      Math.sqrt(12e6 / (width * height)),
    );
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(ratio, ratio);
    renderTerrainLayer(ctx, grid, CELL, columns);
  }, [seed]);

  return (
    <div className={styles.Backdrop} aria-hidden>
      <canvas ref={ref} />
    </div>
  );
};
