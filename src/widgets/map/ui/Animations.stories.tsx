import { useEffect, useMemo, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { createBuilding } from '@entities/buildings';
import { createUnit } from '@entities/units';
import type {
  Building,
  BuildingType,
  Cell,
  CellType,
  Owner,
  Position,
  Unit,
  UnitType,
} from '@shared/config';
import {
  CHOP_DEPTH,
  CHOP_PART,
  CHOPS,
  CLEARING_DURATION,
  drawEffect,
  drawProjectile,
  getAnimationFrame,
  getHourglassFrame,
  planSceneAnimations,
  renderEntitiesLayer,
  renderTerrainLayer,
  type AnimationTrack,
  type Effect,
  type HourglassState,
  type Lunge,
  type SceneEvent,
  type StrikeShot,
} from '../lib';
import { setupCanvas, useDevicePixelRatio } from './utils';

/**
 * Сцена анимации: объекты уже после изменения (как в игре — команда
 * применена), события изменения и дополнительные эффекты. Показ —
 * через тот же план, что у слоя карты (`planSceneAnimations`).
 */
type Scenario = {
  label: string;
  columns: number;
  rows: number;
  /** Особая местность по `"x,y"`; остальное — равнина. */
  cells?: Record<string, CellType>;
  units?: Unit[];
  buildings?: Building[];
  events?: SceneEvent[];
  /** Эффекты не из событий сцены: вырубка, отказ приказа. */
  effects?: Effect[];
  lunges?: Record<string, Lunge>;
  /** Пройденные клетки хода по ID юнита. */
  trails?: Record<string, Position[]>;
  /** Погибшие до попадания — как они выглядели перед ударом. */
  bodies?: Unit[];
  /** Исполненные удары осады; без `from` — орудие не видно, без `to` — цель. */
  strikes?: StrikeShot[];
  /** Катапульты, стоящие взведёнными: удар подготовлен. */
  cocked?: string[];
  /** Песочные часы: пересыпание, затем переворот в новом ходу. */
  hourglass?: string;
  /** Длина цикла с паузой, мс. */
  loop?: number;
};

const LOOP = 2400;
/** Когда начинается новый ход в сцене часов, мс. */
const NEW_TURN = 2200;

const unitAt = (
  type: UnitType,
  x: number,
  y: number,
  owner: Owner = 'p1',
  patch: Partial<Unit> = {},
) => ({ ...createUnit(type, x, y, owner, true)!, ...patch }) as Unit;

const buildingAt = (type: BuildingType, x: number, y: number, owner: Owner) =>
  createBuilding(type, x, y, owner)!;

const wounded = (unit: Unit, amount: number) => ({
  ...unit,
  hp: unit.maxHp - amount,
});

const damage = (unit: Unit, amount: number, strike = false): SceneEvent => ({
  kind: 'damage',
  id: unit.id,
  x: unit.x,
  y: unit.y,
  amount,
  building: false,
  strike,
});

const attack = (attacker: Unit | Building, target: Unit): SceneEvent => ({
  kind: 'attack',
  id: attacker.id,
  type: attacker.type,
  target: { x: target.x, y: target.y },
});

const grid = ({ columns, rows, cells = {} }: Scenario): Cell[][] =>
  Array.from({ length: rows }, (_, y) =>
    Array.from({ length: columns }, (_, x) => {
      const type = cells[`${x},${y}`] ?? 'grass';
      return { x, y, type, isWalkable: type === 'grass' || type === 'hill' };
    }),
  );

const byId = <T extends { id: string }>(items: T[] = []) =>
  Object.fromEntries(items.map(item => [item.id, item]));

const SCENARIOS = ((): Scenario[] => {
  const walker = unitAt('worker', 4, 1);
  const griffon = unitAt('griffon', 4, 0);
  const sword = unitAt('swordsman', 0, 1);
  const spear = wounded(unitAt('spearman', 1, 1, 'p2'), 8);
  const archer = unitAt('archer', 0, 1);
  const archerTarget = wounded(unitAt('swordsman', 3, 1, 'p2'), 12);
  const tower = buildingAt('tower', 0, 1, 'p1');
  const towerTarget = wounded(unitAt('rider', 3, 1, 'p2'), 20);
  const mage = unitAt('mage', 0, 1);
  const mageTarget = wounded(unitAt('spearman', 3, 1, 'p2'), 15);
  const killer = unitAt('archer', 0, 1);
  const siege = unitAt('siege', 0, 2);
  const aiming = unitAt('siege', 0, 2);
  const siegeEmpty = unitAt('siege', 0, 2);
  const siegeHidden = unitAt('siege', 0, 1);
  const underFire = wounded(unitAt('swordsman', 1, 2), 30);
  const strikeTarget = wounded(unitAt('swordsman', 4, 2, 'p2'), 30);
  const hidden = wounded(unitAt('swordsman', 1, 1), 10);
  const lumberjack = unitAt('worker', 0, 1, 'p1', { buildPoints: 0 });
  const recruit = unitAt('archer', 1, 1);
  const farm = buildingAt('farm', 1, 1, 'p1');
  const healer = unitAt('healer', 0, 1);
  const patient = wounded(unitAt('swordsman', 1, 1), 5);
  const tired = unitAt('swordsman', 0, 0, 'p1', {
    movePoints: 0,
    attackPoints: 0,
  });

  return [
    {
      label: 'Ход по клеткам в обход воды',
      columns: 5,
      rows: 3,
      cells: { '2,1': 'water', '2,0': 'water' },
      units: [walker],
      events: [{ kind: 'move', id: walker.id, fromX: 0, fromY: 1 }],
      trails: {
        [walker.id]: [
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
          { x: 3, y: 1 },
          { x: 4, y: 1 },
        ],
      },
    },
    {
      label: 'Полёт грифона — по прямой',
      columns: 5,
      rows: 3,
      cells: { '2,1': 'mountain' },
      units: [griffon],
      events: [{ kind: 'move', id: griffon.id, fromX: 0, fromY: 2 }],
    },
    {
      label: 'Ближний бой: выпад',
      columns: 2,
      rows: 2,
      units: [sword, spear],
      events: [damage(spear, 8), attack(sword, spear)],
    },
    {
      label: 'Лучник: стрела',
      columns: 4,
      rows: 2,
      units: [archer, archerTarget],
      events: [damage(archerTarget, 12), attack(archer, archerTarget)],
    },
    {
      label: 'Башня: стрела',
      columns: 4,
      rows: 2,
      units: [towerTarget],
      buildings: [tower],
      events: [damage(towerTarget, 20), attack(tower, towerTarget)],
    },
    {
      label: 'Маг: сгусток',
      columns: 4,
      rows: 2,
      units: [mage, mageTarget],
      events: [damage(mageTarget, 15), attack(mage, mageTarget)],
    },
    {
      label: 'Гибель от стрелы: цель стоит до попадания',
      columns: 4,
      rows: 2,
      units: [killer],
      bodies: [{ ...unitAt('scout', 3, 1, 'p2'), id: 'scout-dead', hp: 6 }],
      events: [
        {
          kind: 'death',
          id: 'scout-dead',
          x: 3,
          y: 1,
          hp: 6,
          building: false,
          type: 'scout',
          owner: 'p2',
        },
        {
          kind: 'attack',
          id: killer.id,
          type: 'archer',
          target: { x: 3, y: 1 },
        },
      ],
    },
    {
      label: 'Катапульта: взвод при наводке',
      columns: 5,
      rows: 3,
      units: [aiming],
      cocked: [aiming.id],
      events: [
        {
          kind: 'prepare',
          id: aiming.id,
          x: aiming.x,
          y: aiming.y,
          target: { x: 4, y: 2 },
        },
      ],
    },
    {
      label: 'Удар катапульты: камень по цели',
      columns: 5,
      rows: 3,
      units: [siege, strikeTarget],
      strikes: [
        {
          siegeId: siege.id,
          from: { x: siege.x, y: siege.y },
          to: { x: 4, y: 2 },
        },
      ],
      events: [damage(strikeTarget, 30, true)],
    },
    {
      label: 'Удар катапульты по пустой клетке',
      columns: 5,
      rows: 3,
      units: [siegeEmpty],
      strikes: [
        { siegeId: siegeEmpty.id, from: { x: 0, y: 2 }, to: { x: 4, y: 1 } },
      ],
    },
    {
      label: 'Выстрел по скрытой клетке: виден только взмах',
      columns: 2,
      rows: 2,
      units: [siegeHidden],
      strikes: [{ siegeId: siegeHidden.id, from: { x: 0, y: 1 } }],
    },
    {
      label: 'Удар невидимого орудия: камень сверху',
      columns: 2,
      rows: 3,
      units: [underFire],
      strikes: [{ to: { x: 1, y: 2 } }],
      events: [damage(underFire, 30, true)],
    },
    {
      label: 'Урон без видимого атакующего',
      columns: 2,
      rows: 2,
      units: [hidden],
      events: [damage(hidden, 10)],
    },
    {
      label: 'Вырубка леса',
      columns: 3,
      rows: 2,
      units: [lumberjack],
      effects: [
        {
          x: 1,
          y: 1,
          clearing: true,
          fall: 1,
          start: 0,
          duration: CLEARING_DURATION,
        },
      ],
      lunges: {
        [lumberjack.id]: {
          dx: CHOP_DEPTH,
          dy: 0,
          start: 0,
          duration: CLEARING_DURATION * CHOP_PART,
          pulses: CHOPS,
        },
      },
    },
    {
      label: 'Найм',
      columns: 2,
      rows: 2,
      units: [recruit],
      events: [
        {
          kind: 'spawn',
          id: recruit.id,
          x: 1,
          y: 1,
          owner: 'p1',
          building: false,
        },
      ],
    },
    {
      label: 'Постройка',
      columns: 2,
      rows: 2,
      buildings: [farm],
      events: [
        { kind: 'spawn', id: farm.id, x: 1, y: 1, owner: 'p1', building: true },
      ],
    },
    {
      label: 'Лечение',
      columns: 2,
      rows: 2,
      units: [healer, patient],
      events: [{ kind: 'heal', x: 1, y: 1, amount: 5 }],
    },
    {
      label: 'Угроза и отказ приказа',
      columns: 2,
      rows: 2,
      events: [{ kind: 'threat', x: 0, y: 1 }],
      effects: [{ x: 1, y: 1, signal: 'reject', start: 0 }],
    },
    {
      label: 'Песочные часы: ход потрачен → новый ход',
      columns: 1,
      rows: 1,
      units: [tired],
      hourglass: tired.id,
      loop: 3400,
    },
  ];
})();

const hourglassFrame = (t: number): HourglassState | null =>
  t < NEW_TURN
    ? getHourglassFrame({ kind: 'pour', start: 0 }, t, false)
    : getHourglassFrame({ kind: 'flip', start: NEW_TURN }, t, false);

/**
 * Проигрывает сцену по кругу тем же планом и сборщиком кадра, что слой
 * карты (`planSceneAnimations`, `getAnimationFrame`). Звук не играет.
 */
const Player = ({
  scenario,
  cellSize,
  speed,
}: {
  scenario: Scenario;
  cellSize: number;
  speed: number;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const pixelRatio = useDevicePixelRatio();
  const { columns, rows, loop = LOOP } = scenario;
  const cells = useMemo(() => grid(scenario), [scenario]);

  useEffect(() => {
    const ctx = setupCanvas(ref, columns * cellSize, rows * cellSize);
    if (!ctx) return;
    const units = byId(scenario.units);
    const buildings = byId(scenario.buildings);
    const entities: Record<string, Unit | Building> = {
      ...units,
      ...buildings,
    };
    const plan = planSceneAnimations(scenario.events ?? [], {
      instant: false,
      entity: id => entities[id],
      trail: id => scenario.trails?.[id],
      strikes: scenario.strikes,
    });
    plan.effects.push(...(scenario.effects ?? []));
    Object.entries(scenario.lunges ?? {}).forEach(([id, lunge]) =>
      plan.lunges.set(id, lunge),
    );
    const track: AnimationTrack = {
      plan,
      t0: 0,
      ai: false,
      bodies: new Map(scenario.bodies?.map(body => [body.id, body])),
    };
    const origin = performance.now();
    let frame = 0;

    const draw = () => {
      const t = ((performance.now() - origin) * speed) % loop;
      const animation = getAnimationFrame(
        [track],
        () => t,
        id => entities[id],
      );
      const shown = { ...units };
      animation.bodies.forEach(body => {
        if ('maxMovePoints' in body) shown[body.id] = body;
      });
      const glass = scenario.hourglass && hourglassFrame(t);
      const glasses = new Map(
        glass && scenario.hourglass ? [[scenario.hourglass, glass]] : [],
      );
      const drawEffects = (layer: 'under' | 'over') =>
        animation.effects.forEach(({ effect, progress }) =>
          drawEffect(ctx, effect, progress, cellSize, layer),
        );

      renderTerrainLayer(ctx, cells, cellSize, columns);
      drawEffects('under');
      renderEntitiesLayer(
        ctx,
        buildings,
        shown,
        cellSize,
        animation.offsets,
        'p1',
        undefined,
        undefined,
        glasses,
        undefined,
        new Set(scenario.cocked),
      );
      drawEffects('over');
      animation.projectiles.forEach(({ shot, progress }) =>
        drawProjectile(ctx, shot.kind, shot.from, shot.to, progress, cellSize),
      );
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [cellSize, cells, columns, loop, pixelRatio, rows, scenario, speed]);

  return (
    <canvas
      ref={ref}
      style={{ width: columns * cellSize, height: rows * cellSize }}
    />
  );
};

type Args = { cellSize: number; speed: number };

const meta = {
  title: 'Animations',
  args: { cellSize: 64, speed: 1 },
  argTypes: {
    cellSize: { control: { type: 'range', min: 24, max: 128 } },
    speed: { control: { type: 'range', min: 0.1, max: 1, step: 0.05 } },
  },
} satisfies Meta<Args>;

export default meta;

type Story = StoryObj<Args>;

const Gallery = ({
  scenarios,
  cellSize,
  speed,
}: Args & { scenarios: Scenario[] }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 24,
      alignItems: 'flex-end',
    }}
  >
    {scenarios.map(scenario => (
      <figure key={scenario.label} style={{ margin: 0 }}>
        <Player scenario={scenario} cellSize={cellSize} speed={speed} />
        <figcaption style={{ fontSize: 12, maxWidth: 4 * cellSize }}>
          {scenario.label}
        </figcaption>
      </figure>
    ))}
  </div>
);

const pick = (...labels: string[]) =>
  SCENARIOS.filter(({ label }) => labels.some(part => label.startsWith(part)));

/** Все анимации карты по кругу; `speed` замедляет показ для разбора. */
export const All: Story = {
  name: 'Все анимации',
  render: args => <Gallery {...args} scenarios={SCENARIOS} />,
};

export const Movement: Story = {
  name: 'Перемещение',
  render: args => <Gallery {...args} scenarios={pick('Ход', 'Полёт')} />,
};

export const Combat: Story = {
  name: 'Бой',
  render: args => (
    <Gallery
      {...args}
      scenarios={pick(
        'Ближний',
        'Лучник',
        'Башня',
        'Маг',
        'Катапульта',
        'Удар катапульты',
        'Удар невидимого',
        'Выстрел по скрытой',
        'Гибель',
        'Урон',
      )}
    />
  ),
};

export const Work: Story = {
  name: 'Работа и появление',
  render: args => (
    <Gallery
      {...args}
      scenarios={pick('Вырубка', 'Найм', 'Постройка', 'Лечение')}
    />
  ),
};

export const Signals: Story = {
  name: 'Сигналы и часы',
  render: args => <Gallery {...args} scenarios={pick('Угроза', 'Песочные')} />,
};
