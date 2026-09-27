import { beforeEach, expect, it } from 'vite-plus/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_PARTICIPANTS } from '@shared/config';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useUnitsStore } from '@entities/units';
import { UnitOptions } from './UnitOptions';

const buildings = () => useBuildingsStore.getState();

beforeEach(() => {
  useBuildingsStore.setState({ buildings: {}, selectedBuildingForSpawn: null });
  useUnitsStore.setState({ units: {}, selectedUnitForSpawn: null });
  useEconomyStore.getState().resetStore();
  useGameLoopStore.setState({ participants: DEFAULT_PARTICIPANTS });
});

it('карточка рабочего не приписывает лечение, карточка лекаря показывает +20 HP', () => {
  const base = buildings().spawnBuilding('base', 0, 0, 'p1')!;
  const sanctuary = buildings().spawnBuilding('sanctuary', 3, 3, 'p1')!;
  const render = (id: string) =>
    renderToStaticMarkup(
      createElement(UnitOptions, { building: buildings().buildings[id] }),
    );
  expect(render(base)).not.toContain('лечение');
  expect(render(base)).not.toContain('undefined');
  expect(render(sanctuary)).toContain('лечение +20 HP');
});
