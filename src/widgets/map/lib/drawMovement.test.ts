import { describe, expect, it } from 'vite-plus/test';
import { drawZoneOutline } from './drawMovement';

/** Холст-заглушка: запоминает концы отрезков обводки. */
const recorder = () => {
  const points: [number, number][] = [];
  const ctx = {
    canvas: { width: 880, height: 600 },
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    stroke: () => {},
    moveTo: (x: number, y: number) => points.push([x, y]),
    lineTo: (x: number, y: number) => points.push([x, y]),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, points };
};

describe('drawZoneOutline', () => {
  it('не обрезает зону правее ширины холста: координаты мировые', () => {
    const { ctx, points } = recorder();
    // Клетка (28, 13) при 32 px лежит правее холста шириной 880 px.
    drawZoneOutline(ctx, [{ x: 28, y: 13 }], 32, '#fff', {
      columns: 40,
      rows: 40,
    });

    const xs = points.map(([x]) => x);
    expect(Math.min(...xs)).toBe(28 * 32);
    expect(Math.max(...xs)).toBe(29 * 32);
  });

  it('у края карты сдвигает линию внутрь', () => {
    const { ctx, points } = recorder();
    drawZoneOutline(ctx, [{ x: 9, y: 0 }], 32, '#fff', {
      columns: 10,
      rows: 10,
    });

    expect(Math.max(...points.map(([x]) => x))).toBe(10 * 32 - 1.5);
    expect(Math.min(...points.map(([, y]) => y))).toBe(1.5);
  });
});
