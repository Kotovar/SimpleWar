import { afterEach, expect, it, vi } from 'vite-plus/test';
import type { Cell } from '@shared/config';
import { buildSilhouette } from './drawSilhouette';

type PathCommand = [string, ...Array<number | number[]>];

class RecordingPath2D {
  commands: PathCommand[] = [];

  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radii: number[],
  ) {
    this.commands.push(['roundRect', x, y, width, height, radii]);
  }

  moveTo(x: number, y: number) {
    this.commands.push(['moveTo', x, y]);
  }

  lineTo(x: number, y: number) {
    this.commands.push(['lineTo', x, y]);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.commands.push(['quadraticCurveTo', cpx, cpy, x, y]);
  }

  closePath() {
    this.commands.push(['closePath']);
  }
}

afterEach(() => vi.unstubAllGlobals());

it('builds inset cells and all concave corners while evaluating each cell once', () => {
  const paths: RecordingPath2D[] = [];
  class TestPath2D extends RecordingPath2D {
    constructor() {
      super();
      paths.push(this);
    }
  }
  vi.stubGlobal('Path2D', TestPath2D);

  const grid: Cell[][] = Array.from({ length: 3 }, (_, y) =>
    Array.from(
      { length: 3 },
      (_, x): Cell => ({
        x,
        y,
        type: x === 1 && y === 1 ? 'grass' : 'water',
        isWalkable: x === 1 && y === 1,
      }),
    ),
  );
  const matches = new Map<Cell, number>();

  buildSilhouette(grid, 10, cell => {
    matches.set(cell, (matches.get(cell) ?? 0) + 1);
    return cell.type === 'water';
  });

  expect([...matches.values()]).toEqual(Array(9).fill(1));
  const commands = paths[0].commands;
  expect(commands[0]).toEqual(['roundRect', 1, 1, 9, 9, [4.2, 0, 0, 0]]);
  expect(commands.filter(([name]) => name !== 'roundRect')).toEqual([
    ['moveTo', 10, 10],
    ['lineTo', 14.2, 10],
    ['quadraticCurveTo', 10, 10, 10, 14.2],
    ['closePath'],
    ['moveTo', 20, 10],
    ['lineTo', 15.8, 10],
    ['quadraticCurveTo', 20, 10, 20, 14.2],
    ['closePath'],
    ['moveTo', 20, 20],
    ['lineTo', 15.8, 20],
    ['quadraticCurveTo', 20, 20, 20, 15.8],
    ['closePath'],
    ['moveTo', 10, 20],
    ['lineTo', 14.2, 20],
    ['quadraticCurveTo', 10, 20, 10, 15.8],
    ['closePath'],
  ]);
});
