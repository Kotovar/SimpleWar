import { describe, expect, it } from 'vite-plus/test';
import { placeLabel } from './drawPath';

// Клетка 32 px: центры клеток через 32 px. Плашка 40 × 13, отступ 4.
const label = (points: number[][]) => placeLabel(points, 40, 13, 4);

describe('placeLabel', () => {
  it('ставит подпись над серединой горизонтального пути', () => {
    expect(
      label([
        [16, 16],
        [48, 16],
        [80, 16],
        [112, 16],
      ]),
    ).toEqual([64, 16 - 6.5 - 4]);
  });

  it('у вертикального пути уходит вправо', () => {
    expect(
      label([
        [16, 16],
        [16, 48],
        [16, 80],
      ]),
    ).toEqual([16 + 20 + 4, 48]);
  });

  it('не задевает поворот рядом с серединой', () => {
    // Середина на горизонтали в 16 px от поворота вверх.
    const points = [
      [16, 80],
      [48, 80],
      [80, 80],
      [80, 48],
    ];
    // Сверху поворот, по бокам горизонталь — остаётся снизу.
    expect(label(points)).toEqual([64, 80 + 6.5 + 4]);
  });
});

describe('placeLabel — тесные места', () => {
  it('не накрывает зигзаг, отходя дальше от линии', () => {
    // Три вверх, одна вправо, три вверх: рядом с серединой линии со всех сторон.
    const points = [
      [16, 240],
      [16, 208],
      [16, 176],
      [16, 144],
      [48, 144],
      [48, 112],
      [48, 80],
      [48, 48],
    ];
    const [x, y] = label(points);
    // Точки отрезков через 1 px не попадают в плашку.
    const hit = points.slice(1).some(([toX, toY], i) => {
      const [fromX, fromY] = points[i];
      return Array.from({ length: 33 }, (_, t) => [
        fromX + ((toX - fromX) * t) / 32,
        fromY + ((toY - fromY) * t) / 32,
      ]).some(([px, py]) => Math.abs(px - x) < 22 && Math.abs(py - y) < 8.5);
    });
    expect(hit).toBe(false);
  });

  it('у правого края холста уходит влево', () => {
    const points = [
      [624, 16],
      [624, 48],
      [624, 80],
    ];
    const [x] = placeLabel(points, 40, 13, 4, {
      left: 0,
      top: 0,
      right: 640,
      bottom: 480,
    });
    expect(x).toBe(624 - 20 - 4);
  });
});
