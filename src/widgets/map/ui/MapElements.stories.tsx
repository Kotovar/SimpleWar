import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createBuilding } from '@entities/buildings';
import { createUnit } from '@entities/units';
import {
  TERRAIN_NAME,
  type Building,
  type Cell,
  type CellType,
  type Unit,
} from '@shared/config';
import {
  drawBackgroundAndGrid,
  drawEffect,
  drawForest,
  drawGoldOre,
  drawHoverHighlight,
  drawMountains,
  drawMovement,
  drawSelectionHighlight,
  drawTerrainHighlight,
  renderEntitiesLayer,
  renderMovementLayer,
  renderSelectionLayer,
  renderTerrainLayer,
  TERRAIN_VARIANTS,
} from '../lib';
import { setupCanvas, useDevicePixelRatio } from './utils';

type Draw = (ctx: CanvasRenderingContext2D, cellSize: number) => void;

const Scene = ({
  columns,
  rows,
  cellSize,
  draw,
}: {
  columns: number;
  rows: number;
  cellSize: number;
  draw: Draw;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const pixelRatio = useDevicePixelRatio();

  useEffect(() => {
    const ctx = setupCanvas(ref, columns * cellSize, rows * cellSize);
    if (ctx) draw(ctx, cellSize);
  }, [columns, rows, cellSize, draw, pixelRatio]);

  return (
    <canvas
      ref={ref}
      style={{ width: columns * cellSize, height: rows * cellSize }}
    />
  );
};

/** `rows` — высота в клетках: всплывающему числу урона нужно место сверху. */
type Tile = { label: string; draw: Draw; rows?: number };

// Колонки одной ширины: длинная подпись не раздвигает соседние плитки.
const COLUMN_WIDTH = 120;

const Gallery = ({
  cellSize,
  sections,
}: {
  cellSize: number;
  sections: Record<string, Tile[]>;
}) => (
  <div style={{ display: 'grid', gap: 24 }}>
    {Object.entries(sections).map(([title, tiles]) => (
      <section key={title}>
        <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, ${Math.max(cellSize, COLUMN_WIDTH)}px)`,
            gap: 16,
            alignItems: 'end',
          }}
        >
          {tiles.map(({ label, draw, rows = 1 }) => (
            <figure key={label} style={{ margin: 0, textAlign: 'center' }}>
              <Scene columns={1} rows={rows} cellSize={cellSize} draw={draw} />
              <figcaption style={{ fontSize: 12 }}>{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    ))}
  </div>
);

const toCell = (type: CellType, x = 0, y = 0): Cell => ({
  x,
  y,
  type,
  isWalkable: type === 'grass',
});

const ground =
  (type: CellType = 'grass'): Draw =>
  (ctx, size) =>
    drawBackgroundAndGrid(ctx, 1, [[0]], [[toCell(type)]], size);

const withGround =
  (draw: Draw): Draw =>
  (ctx, size) => {
    ground()(ctx, size);
    draw(ctx, size);
  };

const unit = (patch: Partial<Unit> = {}, type: Unit['type'] = 'swordsman') =>
  ({ ...createUnit(type, 0, 0, 'p1', true)!, ...patch }) as Unit;

const place = <T extends Unit | Building>(items: (T | null)[]) =>
  Object.fromEntries(items.map(item => [item!.id, item!])) as Record<string, T>;

const entity = (units: Unit[], buildings: Building[] = []): Draw =>
  withGround((ctx, size) =>
    renderEntitiesLayer(ctx, place(buildings), place(units), size),
  );

const variants = (
  label: string,
  draw: typeof drawForest,
  count: number,
): Tile[] =>
  Array.from({ length: count }, (_, variant) => ({
    label: `${label} ${variant + 1}`,
    draw: withGround((ctx, size) => draw(ctx, 0, 0, size, variant)),
  }));

const TERRAIN: Record<string, Tile[]> = {
  Клетки: [
    { label: TERRAIN_NAME.grass, draw: ground() },
    { label: TERRAIN_NAME.water, draw: ground('water') },
  ],
  [TERRAIN_NAME.forest]: variants(
    TERRAIN_NAME.forest,
    drawForest,
    TERRAIN_VARIANTS.forest,
  ),
  [TERRAIN_NAME.mountain]: variants(
    TERRAIN_NAME.mountain,
    drawMountains,
    TERRAIN_VARIANTS.mountain,
  ),
  [TERRAIN_NAME.gold]: variants(
    TERRAIN_NAME.gold,
    drawGoldOre,
    TERRAIN_VARIANTS.gold,
  ),
};

const enemy = unit({ owner: 'p2' });

// Середина вспышки: видны и подсветка клетки, и число урона.
const EFFECT_PROGRESS = 0.15;
const EFFECT_HEADROOM = 0.4;

const OVERLAYS: Record<string, Tile[]> = {
  'Подсветка ходов': [
    {
      label: 'Можно пройти',
      draw: withGround((ctx, s) => drawMovement(ctx, 0, 0, s, 'free')),
    },
    {
      label: 'Можно построить',
      draw: withGround((ctx, s) => drawMovement(ctx, 0, 0, s, 'produce')),
    },
    {
      label: 'Можно атаковать',
      draw: (ctx, s) => {
        entity([enemy])(ctx, s);
        drawMovement(ctx, 0, 0, s, 'enemy');
      },
    },
  ],
  Выделение: [
    {
      label: 'Сущность',
      draw: (ctx, s) => {
        entity([unit()])(ctx, s);
        drawSelectionHighlight(ctx, 0, 0, s);
      },
    },
    {
      label: 'Клетка',
      draw: withGround((ctx, s) => drawTerrainHighlight(ctx, 0, 0, s)),
    },
    {
      label: 'Под курсором',
      draw: withGround((ctx, s) => drawHoverHighlight(ctx, 0, 0, s)),
    },
  ],
  Здоровье: [1, 0.6, 0.3, 0.1].map(ratio => ({
    label: `${ratio * 100}%`,
    draw: entity([unit({ hp: Math.ceil(unit().maxHp * ratio) })]),
  })),
  'Очки действий': [
    { label: 'Ещё не ходил', draw: entity([unit({ attackPoints: 1 })]) },
    {
      label: 'Походил',
      draw: entity([unit({ movePoints: 1, attackPoints: 1 })]),
    },
    {
      label: 'Нет ходов',
      draw: entity([unit({ movePoints: 0, attackPoints: 0 })]),
    },
    {
      label: 'Нет действий',
      draw: entity(
        [],
        [
          {
            ...createBuilding('tower', 0, 0, 'p1')!,
            attackPoints: 0,
          } as Building,
        ],
      ),
    },
  ],
  // Один момент анимации для всех: число урона поднимается со временем.
  Эффекты: [
    { label: 'Получил урон', damage: 3, lethal: false },
    { label: 'Уничтожен', damage: 5, lethal: true },
  ].map(({ label, ...effect }) => ({
    label,
    rows: 1 + EFFECT_HEADROOM,
    draw: (ctx, s) => {
      ctx.translate(0, s * EFFECT_HEADROOM);
      // Погибшая сущность к моменту эффекта уже убрана с поля.
      (effect.lethal ? ground() : entity([enemy]))(ctx, s);
      drawEffect(ctx, { x: 0, y: 0, start: 0, ...effect }, EFFECT_PROGRESS, s);
    },
  })),
};

const LEGEND: Record<string, CellType> = {
  '.': 'grass',
  '~': 'water',
  F: 'forest',
  '^': 'mountain',
  G: 'gold',
};

const MAP = [
  '~~~....F^^',
  '~~....FF^G',
  '~.........',
  '..........',
  '.F.....~~.',
  'FF....~~~.',
  'F^.....~..',
];

const GRID = MAP.map((row, y) =>
  row.split('').map((char, x) => toCell(LEGEND[char], x, y)),
);

const archer = {
  ...createUnit('archer', 4, 3, 'p1', true)!,
  attackPoints: 1,
};

const UNITS = place<Unit>([
  archer,
  createUnit('worker', 2, 5, 'p1', true),
  { ...createUnit('swordsman', 6, 2, 'p2', true)!, hp: 4 } as Unit,
  createUnit('swordsman', 7, 3, 'p2', true),
]);

const BUILDINGS = place<Building>([
  createBuilding('base', 1, 3, 'p1'),
  createBuilding('mine', 9, 1, 'p1'),
  createBuilding('sawmill', 2, 6, 'p1'),
  createBuilding('base', 9, 5, 'p2'),
  createBuilding('tower', 6, 6, 'p2'),
]);

const drawSampleMap: Draw = (ctx, size) => {
  renderTerrainLayer(ctx, GRID, size, MAP[0].length);
  renderMovementLayer(
    ctx,
    [
      { x: 3, y: 3 },
      { x: 4, y: 2 },
      { x: 4, y: 4 },
      { x: 5, y: 3 },
    ],
    [{ x: 6, y: 2 }],
    null,
    null,
    size,
  );
  renderEntitiesLayer(ctx, BUILDINGS, UNITS, size);
  renderSelectionLayer(
    ctx,
    BUILDINGS,
    UNITS,
    { kind: 'unit', id: archer.id },
    size,
    {
      hover: { x: 5, y: 3 },
      path: [
        [4, 3],
        [5, 3],
      ],
      attackableTargets: [{ x: 6, y: 2 }],
    },
  );
};

type Args = { cellSize: number };

const meta = {
  title: 'Map',
  args: { cellSize: 64 },
  argTypes: { cellSize: { control: { type: 'range', min: 16, max: 128 } } },
} satisfies Meta<Args>;

export default meta;

type Story = StoryObj<Args>;

export const Terrain: Story = {
  render: ({ cellSize }) => <Gallery cellSize={cellSize} sections={TERRAIN} />,
};

export const Overlays: Story = {
  render: ({ cellSize }) => <Gallery cellSize={cellSize} sections={OVERLAYS} />,
};

export const SampleMap: Story = {
  args: { cellSize: 48 },
  render: ({ cellSize }) => (
    <Scene
      columns={MAP[0].length}
      rows={MAP.length}
      cellSize={cellSize}
      draw={drawSampleMap}
    />
  ),
};
