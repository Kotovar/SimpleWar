import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useResearchStore, type ResearchWork } from '@entities/researches';
import { createUnit, useUnitsStore } from '@entities/units';
import type { ResearchType, Unit, UnitType } from '@shared/config';
import { ResourcesInfo, SelectedEntityInfo } from './info';

/** Исследования синих (`p1`) — стороны человека в партии по умолчанию. */
const learn = (completed: ResearchType[], current?: ResearchWork) =>
  useResearchStore.setState({
    completed: { p1: completed },
    current: current ? { p1: current } : {},
  });

const setStock = (gold: number, wood: number) =>
  useEconomyStore.setState(state => ({
    resources: { ...state.resources, p1: { gold, wood } },
  }));

const unit = (
  type: UnitType,
  x: number,
  y: number,
  patch: Partial<Unit> = {},
) => ({ ...createUnit(type, x, y, 'p1', true)!, ...patch }) as Unit;

const byId = <T extends { id: string }>(...items: T[]) =>
  Object.fromEntries(items.map(item => [item.id, item]));

// Копейщик в центре и сосед по стороне: условие Строя выполнено.
const spearman = unit('spearman', 2, 2);
const neighbour = unit('spearman', 2, 3);

const meta = {
  title: 'Interface/Research',
  // Ширина карточки выбранного; `topBar` — верхняя панель.
  decorators: [
    (Story, { parameters }) => (
      <div style={parameters.topBar ? { minHeight: 520 } : { width: 280 }}>
        <Story />
      </div>
    ),
  ],
  beforeEach: () => setStock(1000, 1000),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Кузница свободна, хватает на всё. */
/** Идёт Строй, Картография уже изучена; остальное ждёт освобождения. */
/** Плашка в верхней панели и список по клику. */
export const Summary: Story = {
  name: 'Плашка и список изученного',
  parameters: { topBar: true },
  render: () => <ResourcesInfo />,
  beforeEach: () =>
    learn(['formation', 'artel'], { type: 'hiddenAiming', turnsLeft: 2 }),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /Исследования: изучено 2 из 5/ }),
    );
    await expect(
      await canvas.findByText(/идёт, осталось ходов: 2/),
    ).toBeVisible();
  },
};

/** Кузницы нет: работа на паузе, отменить её можно из списка. */
export const SummaryPaused: Story = {
  name: 'Плашка: пауза без кузницы',
  parameters: { topBar: true },
  render: () => <ResourcesInfo />,
  beforeEach: () => {
    learn([], { type: 'artel', turnsLeft: 1 });
    // Команда отмены работает только в идущей партии.
    useGameLoopStore.setState({ phase: 'inProgress' });
  },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText(/Артель · пауза/)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: /Исследования: изучено 0 из 5/ }),
    );
    await userEvent.click(
      await canvas.findByRole('button', { name: /Отменить исследование/ }),
    );
    await userEvent.click(
      await within(document.body).findByRole('button', { name: 'Отменить' }),
    );
    await expect(useResearchStore.getState().current.p1).toBeUndefined();
  },
};

/** Карточка своего копейщика при изученном Строе. */
export const FormationCard: Story = {
  name: 'Карточка копейщика в строю',
  render: () => (
    <SelectedEntityInfo cell={null} unit={spearman} building={null} />
  ),
  beforeEach: () => {
    learn(['formation']);
    useUnitsStore.setState({ units: byId(spearman, neighbour) });
  },
};

export const FormationCardAlone: Story = {
  name: 'Карточка копейщика без соседа',
  render: () => (
    <SelectedEntityInfo cell={null} unit={spearman} building={null} />
  ),
  beforeEach: () => {
    learn(['formation']);
    useUnitsStore.setState({ units: byId(spearman) });
  },
};

/** Рабочий на добыче уже потратил действие: с Артелью добыча сохраняется. */
