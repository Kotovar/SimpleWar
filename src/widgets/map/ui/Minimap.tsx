import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  getMinimapFrame,
  getMinimapLayout,
  minimapToWorld,
  type ViewportSize,
} from '@shared/lib';
import { useSettingsStore } from '@entities/settings';
import { renderMinimapMarks, renderMinimapTerrain } from '@widgets/map/lib';
import { setupCanvas, useDevicePixelRatio, useScene } from './utils';
import styles from './styles.module.css';

/**
 * Мини-карта: весь мир в области панели с рамкой камеры. Клик и
 * перетаскивание переносят камеру и не меняют выбор и приказы.
 * Показывает ту же сцену, что и основная карта: туман и снимки те же.
 */
export const Minimap = () => {
  const box = useRef<HTMLDivElement>(null);
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const marksRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const pixelRatio = useDevicePixelRatio();

  const { scene } = useScene();
  const columns = useSettingsStore(state => state.gridColumns);
  const rows = useSettingsStore(state => state.gridRows);
  const camera = useSettingsStore(state => state.camera);
  const cellSize = useSettingsStore(state => state.cellSize);
  const viewport = useSettingsStore(state => state.viewport);
  const centerOn = useSettingsStore(state => state.centerOn);

  const world = { columns, rows };
  const layout = getMinimapLayout(world, size);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Рельеф — только при смене карты, разведки или размера мини-карты.
  const { grid, fog } = scene;
  const terrain = fog?.terrain;
  const fogWidth = fog?.width ?? 0;
  useEffect(() => {
    const ctx = setupCanvas(terrainRef, size.width, size.height);
    if (!ctx || !size.width) return;
    ctx.clearRect(0, 0, size.width, size.height);
    renderMinimapTerrain(
      ctx,
      grid,
      getMinimapLayout(
        { columns: grid[0]?.length ?? 0, rows: grid.length },
        size,
      ),
      terrain ? { width: fogWidth, terrain } : null,
    );
  }, [fogWidth, grid, pixelRatio, size, terrain]);

  // Отметки и рамка — при смене состава, позиций или камеры.
  useEffect(() => {
    const ctx = setupCanvas(marksRef, size.width, size.height);
    if (!ctx || !size.width) return;
    const current = getMinimapLayout({ columns, rows }, size);
    ctx.clearRect(0, 0, size.width, size.height);
    renderMinimapMarks(
      ctx,
      scene,
      current,
      getMinimapFrame(current, { columns, rows }, camera, cellSize, viewport),
    );
  }, [camera, cellSize, columns, pixelRatio, rows, scene, size, viewport]);

  const moveCamera = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = minimapToWorld(layout, world, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    centerOn(point.x, point.y);
  };

  return (
    <div ref={box} className={styles.Minimap}>
      <canvas className={styles.MinimapLayer} ref={terrainRef} />
      <canvas
        className={styles.MinimapLayer}
        ref={marksRef}
        role='img'
        aria-label='Мини-карта. Кликните или тащите, чтобы перенести камеру.'
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          moveCamera(event);
        }}
        onPointerMove={event => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            moveCamera(event);
          }
        }}
      />
    </div>
  );
};
