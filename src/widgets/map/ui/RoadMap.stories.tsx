import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createBuilding } from '@entities/buildings';
import { generateMap } from '@entities/maps';
import type {
  Building,
  BuildingType,
  Cell,
  ParticipantId,
  Position,
} from '@shared/config';
import { findCheapestPaths, getMoveCost } from '@shared/lib';
import { renderEntitiesLayer, renderTerrainLayer } from '../lib';
import { setupCanvas, useDevicePixelRatio } from './utils';

const OWNERS: ParticipantId[] = ['p1', 'p2', 'p3', 'p4'];

/** Углы стартов, как в обычной партии: p1, p2 — по диагонали. */
const corners = (width: number, height: number): Position[] => [
  { x: 1, y: 1 },
  { x: width - 2, y: height - 2 },
  { x: width - 2, y: 1 },
  { x: 1, y: height - 2 },
];

/** Самый дешёвый путь по местности; пустой, если не дойти. */
const route = (grid: Cell[][], from: Position, to: Position) => {
  const costs = grid.map(row => row.map(getMoveCost));
  const { previous, cost, width } = findCheapestPaths(costs, from);
  let key: number | undefined = to.y * width + to.x;
  if (!cost.has(key)) return [];
  const path: Position[] = [];
  for (; key !== undefined; key = previous.get(key)) {
    path.push({ x: key % width, y: Math.floor(key / width) });
  }
  return path;
};

/**
 * Ближайшая по пути клетка ресурса и свободная клетка рядом с ней,
 * куда ведёт дорога.
 */
const nearestResource = (
  grid: Cell[][],
  from: Position,
  type: Cell['type'],
  taken: Set<string>,
) => {
  const costs = grid.map(row => row.map(getMoveCost));
  const { cost, width } = findCheapestPaths(costs, from);
  let best: { resource: Position; stand: Position; cost: number } | null = null;
  for (const row of grid) {
    for (const cell of row) {
      if (cell.type !== type || taken.has(`${cell.x},${cell.y}`)) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const spent = cost.get((cell.y + dy) * width + cell.x + dx);
        if (spent === undefined || (best && spent >= best.cost)) continue;
        best = {
          resource: cell,
          stand: { x: cell.x + dx, y: cell.y + dy },
          cost: spent,
        };
      }
    }
  }
  return best;
};

/**
 * Карта по сиду с базами в углах, рудником и лесопилкой у каждой и
 * дорогами: от базы к добыче и между базами по дешёвым путям. Дорога
 * под зданием не рисуется, но стыкуется с ним.
 */
const buildRoadMap = (
  width: number,
  height: number,
  seed: number,
  sides: number,
) => {
  const grid = generateMap(width, height, seed, sides);
  const buildings: Record<string, Building> = {};
  const taken = new Set<string>();
  const lay = (path: Position[]) => {
    for (const { x, y } of path) grid[y][x].road = true;
  };
  const build = (
    type: BuildingType,
    { x, y }: Position,
    owner: ParticipantId,
  ) => {
    const building = createBuilding(type, x, y, owner);
    if (building) buildings[building.id] = building;
    taken.add(`${x},${y}`);
  };

  const starts = corners(width, height).slice(0, sides);
  starts.forEach((base, index) => {
    build('base', base, OWNERS[index]);
    for (const [type, building] of [
      ['gold', 'mine'],
      ['forest', 'sawmill'],
    ] as const) {
      const site = nearestResource(grid, base, type, taken);
      if (!site) continue;
      build(building, site.resource, OWNERS[index]);
      lay(route(grid, base, site.stand));
    }
  });
  // Главные дороги: двое — по диагонали, четверо — кольцом по углам.
  const ring = sides === 2 ? [0, 1] : [0, 2, 1, 3, 0];
  for (let index = 1; index < ring.length; index++) {
    lay(route(grid, starts[ring[index - 1]], starts[ring[index]]));
  }

  return {
    grid,
    buildings,
    builtCells: new Set(Object.values(buildings).map(b => `${b.x},${b.y}`)),
  };
};

type Args = {
  cellSize: number;
  seed: number;
  size: number;
  sides: 2 | 4;
};

const RoadMap = ({ cellSize, seed, size, sides }: Args) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const pixelRatio = useDevicePixelRatio();

  useEffect(() => {
    const ctx = setupCanvas(ref, size * cellSize, size * cellSize);
    if (!ctx) return;
    const { grid, buildings, builtCells } = buildRoadMap(
      size,
      size,
      seed,
      sides,
    );
    renderTerrainLayer(ctx, grid, cellSize, size, builtCells);
    renderEntitiesLayer(ctx, buildings, {}, cellSize);
  }, [cellSize, seed, size, sides, pixelRatio]);

  return (
    <canvas
      ref={ref}
      style={{ width: size * cellSize, height: size * cellSize }}
    />
  );
};

const meta = {
  title: 'Map/Карта с дорогами',
  args: { cellSize: 24, seed: 43, size: 30, sides: 2 },
  argTypes: {
    cellSize: { control: { type: 'range', min: 6, max: 64 } },
    seed: { control: { type: 'number', min: 0 } },
    size: { control: { type: 'select' }, options: [15, 24, 30, 40] },
    sides: { control: { type: 'inline-radio' }, options: [2, 4] },
  },
  render: args => <RoadMap {...args} />,
} satisfies Meta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const TwoSides: Story = { name: 'Двое, 30 × 30' };

export const FourSides: Story = {
  name: 'Четверо, 40 × 40',
  args: { sides: 4, size: 40, cellSize: 18 },
};

export const FarZoom: Story = {
  name: 'Издалека',
  args: { cellSize: 10 },
};
