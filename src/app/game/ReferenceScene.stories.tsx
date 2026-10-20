import type { Meta, StoryObj } from '@storybook/react-vite';
import type {
  Building,
  BuildingType,
  Cell,
  CellType,
  Owner,
  Unit,
  UnitType,
} from '@shared/config';
import { createBuilding, useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { useSettingsStore } from '@entities/settings';
import { createUnit, useUnitsStore } from '@entities/units';
import { useMovementStore } from '@features/pathfinding';
import { useSelectionStore } from '@features/selection';
import { initVisibilitySystem } from '@features/visibility';
import { GameControls } from '@widgets/game-controls';
import { Map, Minimap } from '@widgets/map';
import styles from './styles.module.css';

/**
 * `=` и `H` — дорога по полю и холму. Слева база синих, справа застава
 * красных: часть видна, часть разведана раньше, правый край не открыт.
 */
const MAP = [
  'FFF...hh....^^^^GFF',
  'FG=.....h...~~^^^FF',
  'F.=...........~~^..',
  '..======.hh....~...',
  '..=....=.hHh.......',
  '..=....=====.......',
  'ss......s......FF..',
  'sss...ss...FF.FFF..',
  '.s...FFF..FFF....hh',
  '....FFF........hhh.',
];

const LEGEND: Record<string, CellType> = {
  '.': 'grass',
  '=': 'grass',
  h: 'hill',
  H: 'hill',
  s: 'swamp',
  '~': 'water',
  F: 'forest',
  '^': 'mountain',
  G: 'gold',
};

const WALKABLE: CellType[] = ['grass', 'hill', 'swamp'];

const GRID: Cell[][] = MAP.map((row, y) =>
  row.split('').map((char, x): Cell => {
    const type = LEGEND[char];
    return {
      x,
      y,
      type,
      isWalkable: WALKABLE.includes(type),
      ...('=H'.includes(char) && { road: true as const }),
    };
  }),
);

// Новый объект ждёт начала хода с пустыми очками; в сцене — полные.
const ready = <T extends Unit | Building>(
  entity: T,
  patch: Partial<T> = {},
) => {
  const points: Record<string, number> = {};
  if ('maxMovePoints' in entity) points.movePoints = entity.maxMovePoints;
  if ('maxSpawnPoints' in entity) points.spawnPoints = entity.maxSpawnPoints;
  if ('maxAttackPoints' in entity) points.attackPoints = entity.maxAttackPoints;
  if ('maxBuildPoints' in entity) points.buildPoints = entity.maxBuildPoints;
  return { ...entity, ...points, ...patch } as T;
};

const unit = (
  type: UnitType,
  x: number,
  y: number,
  owner: Owner,
  patch: Partial<Unit> = {},
) => ready(createUnit(type, x, y, owner, true)!, patch);

const building = (type: BuildingType, x: number, y: number, owner: Owner) =>
  ready(createBuilding(type, x, y, owner)!);

const byId = <T extends { id: string }>(list: T[]) =>
  Object.fromEntries(list.map(entity => [entity.id, entity]));

/**
 * Собирает партию в сторах: карта, оба владельца, разведанная раньше
 * застава и выбранный раненый мечник с подсветкой хода и цели.
 */
const setupScene = () => {
  useKnowledgeStore.getState().resetStore();
  useSelectionStore.getState().resetStore();
  useMovementStore.getState().resetStore();
  useSettingsStore.getState().setGridSize(MAP[0].length, MAP.length);
  useMapStore.getState().setGrid(GRID);
  useGameLoopStore.setState({
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 12,
    winner: null,
    eliminated: [],
    participants: [
      { id: 'p1', controller: 'human', palette: 'blue' },
      { id: 'p2', controller: 'ai', palette: 'red' },
    ],
  });
  useEconomyStore.setState(state => ({
    resources: { ...state.resources, p1: { gold: 340, wood: 180 } },
    populationCap: { ...state.populationCap, p1: { occupied: 7, max: 10 } },
  }));
  useBuildingsStore.setState({
    buildings: byId([
      building('base', 1, 4, 'p1'),
      building('mine', 1, 1, 'p1'),
      building('sawmill', 0, 2, 'p1'),
      building('barracks', 4, 5, 'p1'),
      building('tower', 13, 5, 'p2'),
      building('barracks', 16, 4, 'p2'),
    ]),
  });

  const swordsman = unit('swordsman', 9, 4, 'p1', { hp: 60 });
  const army = [
    unit('worker', 2, 2, 'p1'),
    unit('worker', 5, 3, 'p1', { movePoints: 0, buildPoints: 0 }),
    swordsman,
    unit('archer', 7, 5, 'p1'),
    unit('spearman', 6, 4, 'p1'),
    unit('healer', 6, 6, 'p1'),
    unit('swordsman', 10, 4, 'p2', { hp: 35 }),
    unit('rider', 11, 6, 'p2'),
    unit('knight', 10, 5, 'p2'),
    unit('horseArcher', 8, 6, 'p1'),
    unit('archer', 12, 3, 'p2'),
  ];
  // Разведчик открыл заставу и ушёл: она остаётся в памяти под туманом.
  useUnitsStore.setState({
    units: byId([...army, unit('scout', 16, 6, 'p1')]),
  });
  initVisibilitySystem();
  useUnitsStore.setState({ units: byId(army) });

  useSelectionStore.getState().selectUnit(swordsman.id);
  useMovementStore.getState().calculateActionHighlights(swordsman.id);
};

const ReferenceScene = () => (
  <main className={styles.Main}>
    <Map />
    <GameControls
      onStartGame={() => {}}
      onOpenSaves={() => {}}
      minimap={<Minimap />}
    />
  </main>
);

const meta = {
  title: 'Эталон/Сцена партии',
  component: ReferenceScene,
  parameters: { layout: 'fullscreen' },
  beforeEach: setupScene,
} satisfies Meta<typeof ReferenceScene>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Эталон оформления: участок карты, два владельца, туман, карточка и
 * кнопки действий выбранного. На ней сравнивают стиль до переноса на
 * весь состав.
 */
export const Battle: Story = { name: 'Бой у заставы' };
