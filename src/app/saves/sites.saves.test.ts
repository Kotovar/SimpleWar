import { beforeEach, expect, it } from 'vite-plus/test';
import { useSitesStore } from '@entities/sites';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { useMapStore } from '@entities/maps';
import { useKnowledgeStore } from '@entities/perceptions';
import { initPopulationSystem } from '@app/system';
import { initVisibilitySystem } from '@features/visibility';
import type { Site } from '@shared/config';
import { resetGame } from '@features/game-loop';
import { initializeStandardGame } from '@widgets/start-game';
import { applySnapshot, captureSnapshot } from './snapshot';
import { parseSnapshot } from './validation';

beforeEach(() => {
  initPopulationSystem();
  initVisibilitySystem();
  resetGame();
  useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 43 });
  useGameLoopStore.getState().startGame(initializeStandardGame()!);
  const cells = useMapStore
    .getState()
    .grid.flat()
    .filter(c => c.type === 'grass');
  const sites: Site[] = [
    { id: 'gold', type: 'cache', x: 5, y: 1, resource: 'gold', amount: 80 },
    { id: 'wood', type: 'cache', x: 5, y: 2, resource: 'wood', amount: 100 },
    { id: 'refugees', type: 'refugees', x: 5, y: 3 },
    { id: 'obelisk', type: 'obelisk', x: 5, y: 4 },
    { id: 'ruins', type: 'ruins', x: 5, y: 5 },
    { id: 'camp', type: 'camp', x: 5, y: 6, hiresLeft: 3 },
  ];
  useSitesStore.getState().setSites(
    sites.map((site, index) => ({
      ...site,
      x: cells[index].x,
      y: cells[index].y,
    })),
  );
});

it('сохраняет содержимое всех видов находок и сбрасывает их с партией', () => {
  const expected = structuredClone(useSitesStore.getState().sites);
  const saved = captureSnapshot();
  expect(saved.sites).toEqual(expected);
  resetGame();
  expect(useSitesStore.getState().sites).toEqual({});
  applySnapshot(saved);
  expect(useSitesStore.getState().sites).toEqual(expected);
});

it('старый снимок без находок получает пустой набор без генерации', () => {
  const { sites: _sites, ...old } = captureSnapshot();
  const parsed = parseSnapshot(JSON.stringify(old));
  expect(parsed.sites).toEqual({});
  applySnapshot(parsed);
  expect(useSitesStore.getState().sites).toEqual({});
});

it.each([
  ['тип', 'gold', { type: 'unknown' }],
  ['координаты', 'ruins', { x: -1 }],
  ['граница карты', 'ruins', { x: 30 }],
  ['ID', 'gold', { id: 'other' }],
  ['награда', 'gold', { amount: 59 }],
  ['награда деревом', 'wood', { amount: 60 }],
  ['запас лагеря', 'camp', { hiresLeft: 4 }],
  ['лишний владелец', 'ruins', { owner: 'p1' }],
] as const)(
  'отклоняет повреждённую находку до изменения мира: %s',
  (_name, id, patch) => {
    const saved = captureSnapshot();
    Object.assign(saved.sites[id], patch);
    const before = useSitesStore.getState().sites;
    const loop = useGameLoopStore.getState();
    expect(() => applySnapshot(saved)).toThrow();
    expect(useSitesStore.getState().sites).toBe(before);
    expect(useGameLoopStore.getState()).toBe(loop);
  },
);

it('отклоняет две находки в одной клетке и находку вне травы', () => {
  const saved = captureSnapshot();
  saved.sites.ruins.x = saved.sites.obelisk.x;
  saved.sites.ruins.y = saved.sites.obelisk.y;
  expect(() => applySnapshot(saved)).toThrow('находка');
  const invalid = captureSnapshot();
  invalid.map.grid[invalid.sites.ruins.y][invalid.sites.ruins.x].type = 'hill';
  expect(() => applySnapshot(invalid)).toThrow('находка');
});

it('отклоняет ID находки, совпавший с ID юнита', () => {
  const saved = captureSnapshot();
  const id = Object.keys(saved.units)[0];
  saved.sites[id] = { ...saved.sites.ruins, id };
  delete saved.sites.ruins;
  expect(() => applySnapshot(saved)).toThrow('находка');
});

const withMemory = () => {
  const saved = captureSnapshot();
  const camp = saved.sites.camp;
  const k = saved.knowledge.p1!;
  k.sites = {
    camp: { id: camp.id, type: 'camp', x: camp.x, y: camp.y, hiresLeft: 3 },
  };
  k.terrain[camp.y * k.width + camp.x] = 1;
  k.visible[camp.y * k.width + camp.x] = 0;
  return saved;
};

it('сохраняет память находки после её скрытого исчезновения', () => {
  const saved = withMemory();
  saved.sites = {};
  applySnapshot(saved);
  expect(captureSnapshot().knowledge.p1!.sites).toEqual(
    saved.knowledge.p1!.sites,
  );
  expect(useSitesStore.getState().sites).toEqual({});
});

it('старые знания без sites загружаются с пустой памятью без раскрытия мира', () => {
  const saved = withMemory();
  const old = {
    ...saved,
    knowledge: Object.fromEntries(
      Object.entries(saved.knowledge).map(([id, k]) => {
        const { sites: _sites, ...rest } = k;
        return [id, rest];
      }),
    ),
  };
  applySnapshot(parseSnapshot(JSON.stringify(old)));
  for (const k of Object.values(useKnowledgeStore.getState().byParticipant)) {
    expect(k.sites).toEqual({});
  }
  expect(Object.keys(useSitesStore.getState().sites).length).toBeGreaterThan(0);
});

it.each([
  ['тип', { type: 'unknown' }],
  ['ID', { id: 'wrong' }],
  ['граница', { x: 30 }],
  ['запас', { hiresLeft: 4 }],
  ['скрытая награда', { amount: 80 }],
  ['владелец', { owner: 'p2' }],
] as const)(
  'отклоняет повреждённую память находки до изменения знаний: %s',
  (_name, patch) => {
    const saved = withMemory();
    Object.assign(saved.knowledge.p1!.sites.camp, patch);
    const before = useKnowledgeStore.getState().byParticipant;
    expect(() => applySnapshot(saved)).toThrow();
    expect(useKnowledgeStore.getState().byParticipant).toBe(before);
  },
);

it('отклоняет память на неизвестной клетке и две находки в одной клетке', () => {
  const saved = withMemory();
  const k = saved.knowledge.p1!;
  const camp = k.sites.camp;
  k.terrain[camp.y * k.width + camp.x] = 0;
  expect(() => applySnapshot(saved)).toThrow('память находок');
  k.terrain[camp.y * k.width + camp.x] = 1;
  k.sites.other = { ...camp, id: 'other' };
  expect(() => applySnapshot(saved)).toThrow('память находок');
});
