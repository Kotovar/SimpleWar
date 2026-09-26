import type { Meta, StoryObj } from '@storybook/react-vite';
import { createBuilding, useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { createUnit, useUnitsStore } from '@entities/units';
import type {
  Building,
  BuildingType,
  Cell,
  CellType,
  Owner,
  Unit,
  UnitType,
} from '@shared/config';
import { SelectedEntityInfo, UnitOptions, WorkerBuildOptions } from './info';
import styles from './styles.module.css';

type Props = {
  cell: Cell | null;
  unit: Unit | null;
  building: Building | null;
};

/** Панель справа от карты в том же составе, что и в `PhaseInProgress`. */
const ContextPanel = ({ cell, unit, building }: Props) => (
  <aside className={styles.ContextPanel} style={{ width: 340 }}>
    <SelectedEntityInfo cell={cell} unit={unit} building={building} />
    {unit && <WorkerBuildOptions unit={unit} />}
    {building && <UnitOptions building={building} />}
  </aside>
);

const cell = (type: CellType): Cell => ({
  x: 4,
  y: 7,
  type,
  isWalkable: type === 'grass',
});

// Свежесозданная сущность в игре ждёт начала хода с пустыми очками действий.
// В истории выдаём полные, чтобы кнопки блокировало только проверяемое условие.
const ready = <T extends Unit | Building>(entity: T, patch: Partial<T>) => {
  const points: Record<string, number> = {};
  if ('maxSpawnPoints' in entity) points.spawnPoints = entity.maxSpawnPoints;
  if ('maxAttackPoints' in entity) points.attackPoints = entity.maxAttackPoints;
  if ('maxBuildPoints' in entity) points.buildPoints = entity.maxBuildPoints;
  return { ...entity, ...points, ...patch } as T;
};

const unit = (type: UnitType, owner: Owner = 'p1', patch: Partial<Unit> = {}) =>
  ready(createUnit(type, 0, 0, owner, true)!, patch);

const building = (
  type: BuildingType,
  owner: Owner = 'p1',
  patch: Partial<Building> = {},
) => ready(createBuilding(type, 0, 0, owner)!, patch);

const setEconomy = (gold: number, wood: number, occupied = 0, max = 10) =>
  useEconomyStore.setState(state => ({
    resources: { ...state.resources, player: { gold, wood } },
    populationCap: { ...state.populationCap, player: { occupied, max } },
  }));

const meta = {
  title: 'Interface/ContextPanel',
  component: ContextPanel,
  args: { cell: null, unit: null, building: null },
  // Хватает на любую постройку и найм: кнопки активны, пока история не решит иначе.
  beforeEach: () => setEconomy(1000, 1000),
} satisfies Meta<typeof ContextPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GrassCell: Story = { args: { cell: cell('grass') } };

export const ForestCell: Story = { args: { cell: cell('forest') } };

export const Worker: Story = { args: { unit: unit('worker') } };

export const WorkerNoResources: Story = {
  args: { unit: unit('worker') },
  beforeEach: () => setEconomy(0, 0),
};

export const WorkerNoBuildPoints: Story = {
  args: { unit: unit('worker', 'p1', { buildPoints: 0 }) },
};

export const WorkerSelectedBuilding: Story = {
  args: { unit: unit('worker') },
  beforeEach: () =>
    useBuildingsStore.setState({ selectedBuildingForSpawn: 'barracks' }),
};

export const DamagedSwordsman: Story = {
  args: {
    unit: unit('swordsman', 'p1', {
      hp: 3,
      movePoints: 1,
      attackPoints: 1,
    }),
  },
};

export const EnemyArcher: Story = { args: { unit: unit('archer', 'p2') } };

export const Base: Story = { args: { building: building('base') } };

export const Barracks: Story = { args: { building: building('barracks') } };

export const BarracksSelectedUnit: Story = {
  args: { building: building('barracks') },
  beforeEach: () => useUnitsStore.setState({ selectedUnitForSpawn: 'archer' }),
};

export const BarracksPopulationFull: Story = {
  args: { building: building('barracks') },
  beforeEach: () => setEconomy(1000, 1000, 10, 10),
};

export const BarracksNoResources: Story = {
  args: { building: building('barracks') },
  beforeEach: () => setEconomy(0, 0),
};

export const Tower: Story = { args: { building: building('tower') } };

export const Mine: Story = { args: { building: building('mine') } };

export const EnemyBase: Story = {
  args: { building: building('base', 'p2', { hp: 5 }) },
};
