import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Building, BuildingType, Unit, UnitType } from '@shared/config';
import { createBuilding, useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useResearchStore } from '@entities/researches';
import { createUnit, useUnitsStore } from '@entities/units';
import { useHighlightStore } from '@features/pathfinding';
import { useSelectionStore } from '@features/selection';
import { ActionBar } from './ActionBar';

// Новый объект ждёт начала хода с пустыми очками; в истории — полные.
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

const selectUnit = (type: UnitType, patch: Partial<Unit> = {}) => {
  const unit = ready(createUnit(type, 5, 5, 'p1', true)!, patch);
  useUnitsStore.setState({ units: { [unit.id]: unit } });
  useSelectionStore.getState().selectUnit(unit.id);
  return unit;
};

const selectBuilding = (type: BuildingType, patch: Partial<Building> = {}) => {
  const building = ready(createBuilding(type, 5, 5, 'p1')!, patch);
  useBuildingsStore.setState({ buildings: { [building.id]: building } });
  useSelectionStore.getState().selectBuilding(building.id);
  return building;
};

const setStock = (gold: number, wood: number, occupied = 0) =>
  useEconomyStore.setState(state => ({
    resources: { ...state.resources, p1: { gold, wood } },
    populationCap: { ...state.populationCap, p1: { occupied, max: 10 } },
  }));

/** Область карты: панель встаёт по центру низа, как в партии. */
const MapArea = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateAreas: "'map'",
      gridTemplateRows: '1fr',
      height: 360,
      borderRadius: 12,
      background: 'var(--surface-sunken)',
    }}
  >
    <ActionBar />
  </div>
);

const meta = {
  title: 'Interface/ActionBar',
  component: MapArea,
  beforeEach: () => {
    useGameLoopStore.setState({ phase: 'inProgress', activePlayer: 'p1' });
    setStock(1000, 1000);
  },
} satisfies Meta<typeof MapArea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Worker: Story = {
  beforeEach: () => {
    selectUnit('worker');
  },
};

/** Подменю «Построить»: девять зданий в два ряда. */
export const WorkerBuildMenu: Story = {
  beforeEach: () => {
    selectUnit('worker');
  },
  play: () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
  },
};

/** Подменю без ресурсов: здания видны, но приглушены с «!». */
export const WorkerNoResources: Story = {
  beforeEach: () => {
    setStock(0, 0);
    selectUnit('worker');
  },
  play: () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
  },
};

/** Без очка стройки: «Построить» и «Расчистить лес» недоступны. */
export const WorkerNoBuildPoints: Story = {
  beforeEach: () => {
    selectUnit('worker', { buildPoints: 0 });
  },
};

/** Выбрано здание для стройки: над панелью — подсказка режима. */
export const WorkerPlacing: Story = {
  beforeEach: () => {
    selectUnit('worker');
    useBuildingsStore.setState({ selectedBuildingForSpawn: 'sawmill' });
    useHighlightStore.setState({ buildableCells: [{ x: 5, y: 4 }] });
  },
};

export const Barracks: Story = {
  beforeEach: () => {
    selectBuilding('barracks');
  },
};

/** Длинное название: «Осадная машина» в две строки. */
export const Workshop: Story = {
  beforeEach: () => {
    selectBuilding('workshop');
  },
};

export const Sanctuary: Story = {
  beforeEach: () => {
    selectBuilding('sanctuary');
  },
};

export const SanctuaryPopulationFull: Story = {
  beforeEach: () => {
    setStock(1000, 1000, 10);
    selectBuilding('sanctuary');
  },
};

/** Длинные названия исследований: «Картография», «Скрытая наводка». */
export const Forge: Story = {
  beforeEach: () => {
    selectBuilding('forge');
  },
};

export const ForgeResearching: Story = {
  beforeEach: () => {
    useResearchStore.setState({
      current: { p1: { type: 'cartography', turnsLeft: 2 } },
    });
    selectBuilding('forge');
  },
};

export const Mine: Story = {
  beforeEach: () => {
    selectBuilding('mine');
  },
};

export const Siege: Story = {
  beforeEach: () => {
    selectUnit('siege');
  },
};

export const SiegePrepared: Story = {
  beforeEach: () => {
    selectUnit('siege', { preparedStrike: { x: 7, y: 5 } });
  },
};

/** Ход противника: все кнопки недоступны. */
export const EnemyTurn: Story = {
  beforeEach: () => {
    useGameLoopStore.setState({ activePlayer: 'p2' });
    selectUnit('worker');
  },
};
