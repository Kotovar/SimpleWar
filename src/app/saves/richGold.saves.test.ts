import { beforeEach, expect, it } from 'vite-plus/test';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import {
  getParticipantKnowledge,
  isKnownRichGold,
  RICH_BIT,
  useKnowledgeStore,
} from '@entities/perceptions';
import { initPopulationSystem } from '@app/system';
import { initVisibilitySystem } from '@features/visibility';
import { resetGame } from '@features/game-loop';
import { initializeStandardGame } from '@widgets/start-game';
import { applySnapshot, captureSnapshot } from './snapshot';
import { parseSnapshot } from './validation';

beforeEach(() => {
  initPopulationSystem();
  initVisibilitySystem();
  resetGame();
  useSettingsStore.setState({
    gridColumns: 30,
    gridRows: 30,
    mapGenerationMode: 'fixed',
    customSeed: 43,
  });
  useGameLoopStore.getState().startGame(initializeStandardGame()!);
});

const discover = () => {
  const cells = useMapStore.getState().grid.flat();
  const rich = cells.find(c => c.rich)!;
  const near = cells.find(
    c => c.isWalkable && Math.hypot(c.x - rich.x, c.y - rich.y) <= 3,
  )!;
  expect(
    useUnitsStore.getState().spawnUnit('scout', near.x, near.y, 'p1', true),
  ).not.toBeNull();
  expect(isKnownRichGold(getParticipantKnowledge('p1'), rich.x, rich.y)).toBe(
    true,
  );
  return rich;
};

it('сохраняет реальную богатую жилу и её открытие без повторной разведки', () => {
  const rich = discover();
  const saved = captureSnapshot();
  resetGame();
  applySnapshot(saved);
  expect(useMapStore.getState().getCell(rich.x, rich.y)?.rich).toBe(true);
  expect(isKnownRichGold(getParticipantKnowledge('p1'), rich.x, rich.y)).toBe(
    true,
  );
  expect(captureSnapshot().knowledge).toEqual(saved.knowledge);
});

it('старый снимок без богатства загружается без генерации жил и новых знаний', () => {
  discover();
  const saved = captureSnapshot();
  saved.generatorVersion = 7;
  for (const cell of saved.map.grid.flat()) delete cell.rich;
  for (const k of Object.values(saved.knowledge))
    k.terrain = k.terrain.map(code => code & ~RICH_BIT);
  applySnapshot(parseSnapshot(JSON.stringify(saved)));
  expect(
    useMapStore
      .getState()
      .grid.flat()
      .some(c => c.rich),
  ).toBe(false);
  expect(
    Object.values(useKnowledgeStore.getState().byParticipant).some(k =>
      k.terrain.some(code => code & RICH_BIT),
    ),
  ).toBe(false);
});

it.each([1 | RICH_BIT, RICH_BIT, 0xc0, 7 | 0x20, 256, -1])(
  'отклоняет повреждённый код памяти %s до изменения мира',
  code => {
    const rich = discover();
    const saved = captureSnapshot();
    const k = saved.knowledge.p1!;
    k.terrain[rich.y * k.width + rich.x] = code;
    const before = useKnowledgeStore.getState().byParticipant;
    expect(() => applySnapshot(saved)).toThrow();
    expect(useKnowledgeStore.getState().byParticipant).toBe(before);
  },
);

it('отклоняет богатство на незолотой клетке до изменения карты', () => {
  const saved = captureSnapshot();
  saved.map.grid.flat().find(c => c.type === 'grass')!.rich = true;
  const before = useMapStore.getState().grid;
  expect(() => applySnapshot(saved)).toThrow('карта');
  expect(useMapStore.getState().grid).toBe(before);
});
