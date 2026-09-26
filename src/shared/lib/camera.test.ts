import { describe, expect, it } from 'vite-plus/test';
import {
  centerCameraOn,
  clampCamera,
  getCameraOffset,
  getFitCellSize,
  getVisibleRange,
  screenToCell,
  screenToWorld,
  worldToScreen,
  zoomCameraAt,
} from './camera';

const viewport = { width: 320, height: 160 };
const world = { columns: 100, rows: 60 };

describe('преобразования камеры', () => {
  it('экран → мир → экран возвращает ту же точку', () => {
    const camera = { x: 12.25, y: 3.5 };
    for (const point of [
      { x: 0, y: 0 },
      { x: 17, y: 93 },
      { x: 319.5, y: 159 },
    ]) {
      const back = worldToScreen(camera, 24, screenToWorld(camera, 24, point));
      expect(back.x).toBeCloseTo(point.x);
      expect(back.y).toBeCloseTo(point.y);
    }
  });

  it('находит клетку у границы и отрицательные клетки вне мира', () => {
    const camera = { x: 0, y: 0 };
    expect(screenToCell(camera, 32, { x: 31.9, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(screenToCell(camera, 32, { x: 32, y: 32 })).toEqual({ x: 1, y: 1 });
    expect(screenToCell({ x: -1.5, y: 0 }, 32, { x: 0, y: -1 })).toEqual({
      x: -2,
      y: -1,
    });
  });

  it('при масштабе клетка под курсором остаётся под ним', () => {
    const camera = { x: 10, y: 20 };
    const anchor = { x: 100, y: 50 };
    const before = screenToWorld(camera, 32, anchor);
    const next = zoomCameraAt(camera, 32, 48, anchor);
    const after = screenToWorld(next, 48, anchor);

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});

describe('ограничение камеры', () => {
  it('не выпускает окно за края большого мира', () => {
    expect(clampCamera({ x: -5, y: -1 }, 32, viewport, world)).toEqual({
      x: 0,
      y: 0,
    });
    // Окно 10 × 5 клеток: правый нижний угол прижат к краю мира.
    expect(clampCamera({ x: 99, y: 70 }, 32, viewport, world)).toEqual({
      x: 90,
      y: 55,
    });
  });

  it('выпускает край мира не дальше поля', () => {
    // Поле 64 px = 2 клетки по 32 px.
    expect(clampCamera({ x: -5, y: 99 }, 32, viewport, world, 64)).toEqual({
      x: -2,
      y: 57,
    });
    expect(clampCamera({ x: 1, y: 3 }, 32, viewport, world, 64)).toEqual({
      x: 1,
      y: 3,
    });
  });

  it('центрирует мир, который меньше окна', () => {
    const small = { columns: 5, rows: 2 };
    expect(clampCamera({ x: 3, y: 1 }, 32, viewport, small)).toEqual({
      x: -2.5,
      y: -1.5,
    });
  });

  it('центрирует окно на точке мира', () => {
    expect(centerCameraOn({ x: 50, y: 30 }, 32, viewport)).toEqual({
      x: 45,
      y: 27.5,
    });
  });

  it('подбирает масштаб, при котором мир целиком в окне', () => {
    expect(getFitCellSize(viewport, world)).toBe(2);
    expect(
      getFitCellSize({ width: 800, height: 600 }, { columns: 15, rows: 15 }),
    ).toBe(40);
    expect(getFitCellSize({ width: 10, height: 10 }, world)).toBe(1);
  });

  it('округляет сдвиг холста до пикселя буфера', () => {
    expect(getCameraOffset({ x: 1.3, y: 0.01 }, 10, 2)).toEqual({
      x: 13,
      y: 0,
    });
  });
});

describe('видимые клетки', () => {
  it('берёт окно с запасом и обрезает по миру', () => {
    expect(getVisibleRange({ x: 10.5, y: 4 }, 32, viewport, world)).toEqual({
      x0: 9,
      y0: 3,
      x1: 22,
      y1: 10,
    });
  });

  it('у края мира не выходит за границы', () => {
    expect(getVisibleRange({ x: 90, y: 55 }, 32, viewport, world, 2)).toEqual({
      x0: 88,
      y0: 53,
      x1: 100,
      y1: 60,
    });
    expect(
      getVisibleRange({ x: -3, y: -2 }, 32, viewport, { columns: 4, rows: 2 }),
    ).toEqual({ x0: 0, y0: 0, x1: 4, y1: 2 });
  });
});
