import { describe, expect, it } from 'vite-plus/test';
import {
  getMinimapFrame,
  getMinimapLayout,
  minimapToWorld,
  worldToMinimap,
} from './minimap';

const box = { width: 200, height: 200 };

describe('мини-карта', () => {
  it('сохраняет пропорции прямоугольной карты и центрирует её', () => {
    expect(getMinimapLayout({ columns: 100, rows: 60 }, box)).toEqual({
      scale: 2,
      offsetX: 0,
      offsetY: 40,
      width: 200,
      height: 120,
    });
  });

  it('мир → мини-карта → мир возвращает ту же точку', () => {
    const world = { columns: 100, rows: 60 };
    const layout = getMinimapLayout(world, box);
    const point = { x: 37.5, y: 59 };
    expect(
      minimapToWorld(layout, world, worldToMinimap(layout, point)),
    ).toEqual(point);
  });

  it('клик по краю и полям прижимается к границе мира', () => {
    const world = { columns: 15, rows: 15 };
    const layout = getMinimapLayout(world, box);
    expect(minimapToWorld(layout, world, { x: 200, y: 200 })).toEqual({
      x: 15,
      y: 15,
    });
    expect(minimapToWorld(layout, world, { x: -4, y: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('рамка камеры повторяет окно и обрезается у краёв', () => {
    const world = { columns: 100, rows: 60 };
    const layout = getMinimapLayout(world, box);
    const viewport = { width: 320, height: 160 };

    expect(
      getMinimapFrame(layout, world, { x: 10, y: 5 }, 32, viewport),
    ).toEqual({
      x: 20,
      y: 50,
      width: 20,
      height: 10,
    });
    // Маленький мир центрирован в большом окне: рамка — вся карта.
    expect(
      getMinimapFrame(
        getMinimapLayout({ columns: 5, rows: 5 }, box),
        { columns: 5, rows: 5 },
        { x: -2.5, y: 0 },
        32,
        viewport,
      ),
    ).toEqual({ x: 0, y: 0, width: 200, height: 200 });
  });
});
