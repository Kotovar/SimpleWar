import { createNoise2D } from 'simplex-noise';
import type { Cell, CellType } from '@shared/config';

/**
 * Базовое количество золота на клетку.
 * Примерно 1 золотая клетка на каждые 50 обычных клеток.
 */
const GOLD_DENSITY = 50;

/**
 * Минимальное количество золота даже на самой маленькой карте
 */
const MIN_GOLD = 8;

/**
 * Максимальное количество золота
 */
const MAX_GOLD = 20;

/**
 * Генерирует процедурную карту игрового мира на основе шума Simplex.
 *
 * Карта состоит из клеток разных типов: вода, трава, лес, горы и золото.
 * Основной рельеф (вода/земля/лес/горы) формируется с помощью двухслойного шума Simplex:
 *   - крупномасштабный шум определяет основные биомы,
 *   - мелкий шум добавляет детали.
 *
 * Золото размещается отдельным этапом после генерации ландшафта.
 * Оно редкое (всего {@link TOTAL_GOLD} штук) и распределяется небольшими кластерами
 * вокруг 5 заранее заданных центров:
 *   - верхний левый угол
 *   - нижний правый угол
 *   - центр карты
 *   - нижний левый угол
 *   - верхний правый угол
 *
 * Если в каком-то кластере не хватает подходящих клеток, золото просто не размещается
 * (общее количество может быть чуть меньше заданного).
 *
 * @param width  Ширина карты в клетках
 * @param height Высота карты в клетках
 * @param seed   Опциональное зерно для воспроизводимости генерации.
 *               Если не указано — используется случайное значение.
 *
 * @returns Двумерный массив клеток {@link Cell} размером height × width
 *
 * @example
 * const map = generateMap(100, 80, 12345);
 * // map[0][0] — клетка в левом верхнем углу
 */
export const generateMap = (
  width: number,
  height: number,
  seed?: number,
): Cell[][] => {
  const grid: Cell[][] = [];

  const noise2D = createNoise2D(() => seed ?? Math.random());

  const avgSize = (width + height) / 2;
  const featureScale = avgSize / 3;
  const detailScale = avgSize / 3;

  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      const mainValue = noise2D(x / featureScale, y / featureScale);
      const detailValue =
        noise2D((x + 1000) / detailScale, (y + 1000) / detailScale) * 0.3;

      const totalValue = mainValue + detailValue;

      let type: CellType;
      let isWalkable: boolean;

      if (totalValue < -0.5) {
        type = 'water';
        isWalkable = false;
      } else if (totalValue > 0.75) {
        type = 'mountain';
        isWalkable = false;
      } else if (totalValue > 0.55) {
        type = 'forest';
        isWalkable = false;
      } else {
        type = 'grass';
        isWalkable = true;
      }

      grid[y][x] = {
        x,
        y,
        type,
        isWalkable,
      };
    }
  }

  // --- Этап: размещение золота ---

  const totalCells = width * height;

  let remainingGold = Math.max(
    MIN_GOLD,
    Math.min(MAX_GOLD, Math.floor(totalCells / GOLD_DENSITY)),
  );

  const centers = [
    { x: Math.floor(width * 0.25), y: Math.floor(height * 0.25) },
    { x: Math.floor(width * 0.75), y: Math.floor(height * 0.75) },
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },
    { x: Math.floor(width * 0.25), y: Math.floor(height * 0.75) },
    { x: Math.floor(width * 0.75), y: Math.floor(height * 0.25) },
  ];

  const goldPerCluster = Math.floor(remainingGold / centers.length);
  const clusterRadius = Math.floor(Math.min(width, height) / 5);

  for (const center of centers) {
    if (remainingGold <= 0) break;

    let placedInCluster = 0;
    const targetInCluster = Math.min(
      goldPerCluster + (remainingGold % centers.length),
      remainingGold,
    );

    for (
      let attempt = 0;
      attempt < 50 && placedInCluster < targetInCluster;
      attempt++
    ) {
      const dx =
        Math.floor(Math.random() * (clusterRadius * 2 + 1)) - clusterRadius;
      const dy =
        Math.floor(Math.random() * (clusterRadius * 2 + 1)) - clusterRadius;

      const x = center.x + dx;
      const y = center.y + dy;

      if (x >= 0 && x < width && y >= 0 && y < height) {
        const cell = grid[y][x];
        if (cell.type === 'grass') {
          cell.type = 'gold';
          cell.isWalkable = false;
          placedInCluster++;
          remainingGold--;
        }
      }
    }
  }

  return grid;
};
