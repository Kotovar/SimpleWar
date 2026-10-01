import { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ParticipantKnowledge } from '@entities/perceptions';
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
  drawFormationBadge,
  drawForest,
  drawGoldOre,
  drawHill,
  drawHoverHighlight,
  drawMountains,
  drawMovement,
  drawSelectionHighlight,
  drawTerrainHighlight,
  drawSwamp,
  renderEntitiesLayer,
  renderFogLayer,
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
  (draw: Draw, type: CellType = 'grass'): Draw =>
  (ctx, size) => {
    ground(type)(ctx, size);
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
  type: CellType = 'grass',
): Tile[] =>
  Array.from({ length: count }, (_, variant) => ({
    label: `${label} ${variant + 1}`,
    draw: withGround((ctx, size) => draw(ctx, 0, 0, size, variant), type),
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
  [TERRAIN_NAME.hill]: variants(
    TERRAIN_NAME.hill,
    drawHill,
    TERRAIN_VARIANTS.hill,
  ),
  [TERRAIN_NAME.swamp]: variants(
    TERRAIN_NAME.swamp,
    drawSwamp,
    TERRAIN_VARIANTS.swamp,
    'swamp',
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
  // Трещины и дым — с половины HP: статус виден без цвета полосы.
  'Здоровье здания': [1, 0.6, 0.5, 0.2].map(ratio => {
    const barracks = createBuilding('barracks', 0, 0, 'p1')!;
    return {
      label: `${ratio * 100}%`,
      draw: entity(
        [],
        [{ ...barracks, hp: Math.ceil(barracks.maxHp * ratio) }],
      ),
    };
  }),
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
  // Рисунки эффектов исследований; условие Строя проверяет игра.
  Исследования: [
    {
      label: 'Строй: +2 брони',
      draw: (ctx, s) => {
        entity([unit({}, 'spearman')])(ctx, s);
        drawFormationBadge(ctx, 0, 0, s);
      },
    },
    { label: 'Копейщик без строя', draw: entity([unit({}, 'spearman')]) },
    {
      label: 'Частокол',
      draw: entity([], [createBuilding('palisade', 0, 0, 'p1')!]),
    },
  ],
  // Один момент анимации для всех: число урона поднимается со временем.
  Эффекты: [
    { label: 'Получил урон', damage: 3, lethal: false },
    { label: 'Вылечен', healing: 7 },
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

// Сигналы дублируют звук: стройка, замеченная угроза и отказ приказа.
OVERLAYS['Сигналы'] = (
  [
    ['Стройка: пыль', 'under', { spawn: 'p1', building: true }],
    ['Стройка: молотки', 'over', { spawn: 'p1', building: true }],
    ['Найм', 'over', { spawn: 'p1' }],
    ['Угроза', 'over', { signal: 'threat' }],
    ['Отказ приказа', 'over', { signal: 'reject' }],
  ] as const
).map(([label, layer, effect]) => ({
  label,
  rows: 1 + EFFECT_HEADROOM,
  draw: (ctx, s) => {
    ctx.translate(0, s * EFFECT_HEADROOM);
    const model =
      'building' in effect
        ? entity([], [createBuilding('barracks', 0, 0, 'p1')!])
        : 'spawn' in effect
          ? entity([unit()])
          : effect.signal === 'threat'
            ? entity([enemy])
            : ground();
    model(ctx, s);
    drawEffect(ctx, { x: 0, y: 0, start: 0, ...effect }, 0.3, s, layer);
  },
}));

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

const FOG_GRID = Array.from({ length: 5 }, (_, y) =>
  Array.from({ length: 8 }, (_, x) => toCell(x < 3 ? 'forest' : 'grass', x, y)),
);

const FOG_KNOWLEDGE: ParticipantKnowledge = {
  width: 8,
  height: 5,
  visible: Uint8Array.from(
    Array.from({ length: 40 }, (_, index) => {
      const x = index % 8;
      const y = Math.floor(index / 8);
      return Math.abs(x - 5) + Math.abs(y - 2) <= 2 ? 1 : 0;
    }),
  ),
  terrain: Uint8Array.from(
    Array.from({ length: 40 }, (_, index) => {
      const x = index % 8;
      return x < 7 ? (x < 3 ? 6 : 1) : 0;
    }),
  ),
  contacts: {},
  strikes: {},
};

const drawFog: Draw = (ctx, size) => {
  renderTerrainLayer(ctx, FOG_GRID, size, FOG_GRID[0].length);
  renderFogLayer(ctx, FOG_KNOWLEDGE, size, {
    x0: 0,
    y0: 0,
    x1: FOG_KNOWLEDGE.width,
    y1: FOG_KNOWLEDGE.height,
  });
};

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
      path: {
        path: [
          { x: 4, y: 3 },
          { x: 5, y: 3 },
        ],
        cost: 1,
      },
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

export const FogOfWar: Story = {
  name: 'Туман войны',
  render: ({ cellSize }) => (
    <Scene columns={8} rows={5} cellSize={cellSize} draw={drawFog} />
  ),
};
