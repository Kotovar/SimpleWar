import { describe, expect, it } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import {
  computeVisibility,
  getSightSources,
  isCellVisible,
  type Viewer,
} from './vision';

const makeGrid = (width: number, height: number): Cell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'grass' as const,
      isWalkable: true,
    })),
  );

const viewer = (x: number, y: number, sightRange: number): Viewer => ({
  x,
  y,
  sightRange,
  owner: 'p1',
});

const visibleCells = (mask: Uint8Array, width: number) =>
  [...mask.keys()]
    .filter(index => mask[index])
    .map(index => `${index % width},${Math.floor(index / width)}`);

describe('обзор', () => {
  it('видит ромб по Manhattan включительно до границы радиуса', () => {
    const grid = makeGrid(7, 7);
    const sources = getSightSources('p1', [viewer(3, 3, 2)], grid);
    const mask = computeVisibility(7, 7, sources);

    expect(visibleCells(mask, 7)).toHaveLength(13);
    expect(isCellVisible(sources, 5, 3)).toBe(true);
    expect(isCellVisible(sources, 4, 4)).toBe(true);
    expect(isCellVisible(sources, 5, 4)).toBe(false);
    expect(mask[3 * 7 + 6]).toBe(0);
  });

  it('объединяет обзор нескольких своих источников и не берёт чужие', () => {
    const grid = makeGrid(9, 1);
    const sources = getSightSources(
      'p1',
      [viewer(0, 0, 1), viewer(8, 0, 1), { ...viewer(4, 0, 4), owner: 'p2' }],
      grid,
    );

    expect(visibleCells(computeVisibility(9, 1, sources), 9)).toEqual([
      '0,0',
      '1,0',
      '7,0',
      '8,0',
    ]);
  });

  it('обрезает ромб у края карты', () => {
    const sources = getSightSources('p1', [viewer(0, 0, 3)], makeGrid(2, 2));
    expect(computeVisibility(2, 2, sources)).toEqual(
      new Uint8Array([1, 1, 1, 1]),
    );
  });

  it('холм под источником добавляет единицу к радиусу', () => {
    const grid = makeGrid(9, 1);
    grid[0][4].type = 'hill';
    const [onHill] = getSightSources('p1', [viewer(4, 0, 2)], grid);
    const [onGrass] = getSightSources('p1', [viewer(3, 0, 2)], grid);

    expect(onHill.radius).toBe(3);
    expect(onGrass.radius).toBe(2);
  });

  it('без источников ничего не видно: гибель последнего снимает обзор', () => {
    expect(computeVisibility(3, 3, [])).toEqual(new Uint8Array(9));
    expect(isCellVisible([], 0, 0)).toBe(false);
  });
});
