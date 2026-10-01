import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createBuilding } from '@entities/buildings';
import { createUnit } from '@entities/units';
import {
  BUILDINGS_NAME,
  DETAIL_LEVEL,
  UNITS_NAME,
  type Building,
  type BuildingType,
  type Cell,
  type Owner,
  type Unit,
  type UnitType,
} from '@shared/config';
import { renderEntitiesLayer, renderTerrainLayer } from '../lib';
import { setupCanvas, useDevicePixelRatio } from './utils';

const UNIT_TYPES = Object.keys(UNITS_NAME) as UnitType[];
const BUILDING_TYPES = Object.keys(BUILDINGS_NAME) as BuildingType[];
const COLUMNS = Math.max(UNIT_TYPES.length, BUILDING_TYPES.length);
const OWNERS: Owner[] = ['p1', 'p2'];
const ROWS = OWNERS.length * 2;

const GRID: Cell[][] = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLUMNS }, (_, x) => ({
    x,
    y,
    type: 'grass' as const,
    isWalkable: true,
  })),
);

const byId = <T extends { id: string }>(items: T[]) =>
  Object.fromEntries(items.map(item => [item.id, item]));

/**
 * Строки: юниты и здания каждой стороны. Часть объектов ранена и
 * отходила, чтобы статусы были видны на всех масштабах.
 */
const UNITS = byId(
  OWNERS.flatMap((owner, row) =>
    UNIT_TYPES.map((type, x) => {
      const unit = createUnit(type, x, row * 2, owner, true)!;
      return {
        ...unit,
        hp: x % 3 === 0 ? Math.ceil(unit.maxHp * 0.4) : unit.hp,
      } as Unit;
    }),
  ),
);

const BUILDINGS = byId(
  OWNERS.flatMap((owner, row) =>
    BUILDING_TYPES.map((type, x) => {
      const building = createBuilding(type, x, row * 2 + 1, owner)!;
      return {
        ...building,
        hp: x % 4 === 1 ? Math.ceil(building.maxHp * 0.3) : building.hp,
      } as Building;
    }),
  ),
);

type Args = { cellSize: number; monochrome: boolean };

const Roster = ({ cellSize, monochrome }: Args) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const pixelRatio = useDevicePixelRatio();

  useEffect(() => {
    const ctx = setupCanvas(ref, COLUMNS * cellSize, ROWS * cellSize);
    if (!ctx) return;
    renderTerrainLayer(ctx, GRID, cellSize, COLUMNS);
    renderEntitiesLayer(ctx, BUILDINGS, UNITS, cellSize, undefined, 'p1');
  }, [cellSize, pixelRatio]);

  return (
    <canvas
      ref={ref}
      style={{
        width: COLUMNS * cellSize,
        height: ROWS * cellSize,
        filter: monochrome ? 'grayscale(1)' : undefined,
      }}
    />
  );
};

/**
 * Весь состав обеих сторон в реальном рендере карты. Владелец различим
 * формой маркера, а не только цветом — проверяется монохромом. Масштаб
 * переключает детализацию: значки, силуэты, детали.
 */
const meta = {
  title: 'Map/Состав',
  component: Roster,
  args: { cellSize: 40, monochrome: false },
  argTypes: { cellSize: { control: { type: 'range', min: 6, max: 64 } } },
} satisfies Meta<typeof Roster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Detail: Story = { name: 'Вблизи' };

export const Silhouette: Story = {
  name: 'Средний масштаб',
  args: { cellSize: DETAIL_LEVEL.icon + 2 },
};

export const Icons: Story = {
  name: 'Издалека',
  args: { cellSize: DETAIL_LEVEL.icon - 4 },
};

export const Monochrome: Story = {
  name: 'Монохром',
  args: { monochrome: true },
};
