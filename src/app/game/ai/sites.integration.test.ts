import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant } from '@shared/config';
import { initPopulationSystem } from '@app/system/population';
import { createAiMemory } from '@entities/ai-memories';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { useKnowledgeStore } from '@entities/perceptions';
import { useSitesStore } from '@entities/sites';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { AI_RULES, playTurn } from '@features/ai';
import { initGameLoopEvents, nextTurn, resetGame } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { autoExplore, getExplorationTarget } from '@features/pathfinding';
import { executeAiAction } from './aiTurn';

const participants: Participant[] = [
  { id: 'p1', controller: 'human' },
  { id: 'p2', controller: 'ai' },
];
const run = (ids?: string[], memory = createAiMemory(7)) =>
  playTurn({
    memory,
    rules: ids ? AI_RULES.filter(rule => ids.includes(rule.id)) : AI_RULES,
    observe: () => getObservation('p2'),
    execute: action => executeAiAction('p2', action),
    isCancelled: () => false,
    endTurn: () => {},
    yieldControl: () => Promise.resolve(),
  });
beforeEach(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
  resetGame();
  const grid: Cell[][] = Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 20 }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
  useMapStore.setState({ grid });
  useGameLoopStore.setState({
    participants,
    phase: 'inProgress',
    currentTurn: 1,
    activePlayer: 'p2',
    eliminated: [],
  });
  useBuildingsStore.getState().spawnBuilding('base', 1, 1, 'p2');
  useBuildingsStore.getState().spawnBuilding('base', 18, 18, 'p1');
  useEconomyStore.getState().addResources('p2', { gold: 2000, wood: 2000 });
});
afterEach(resetGame);

it.each(['cache', 'refugees', 'obelisk'] as const)(
  'авторазведка сначала подбирает открытый %s',
  type => {
    const scout = useUnitsStore
      .getState()
      .spawnUnit('scout', 5, 5, 'p2', true)!;
    useSitesStore
      .getState()
      .setSites([
        type === 'cache'
          ? { id: 'pickup', type, x: 5, y: 3, resource: 'gold', amount: 90 }
          : { id: 'pickup', type, x: 5, y: 3 },
      ]);
    expect(
      getExplorationTarget(
        useUnitsStore.getState().units[scout],
        'p2',
      )?.path.at(-1),
    ).toEqual({ x: 5, y: 3 });
    expect(autoExplore({ actor: 'p2', unitId: scout }).ok).toBe(true);
    expect(useSitesStore.getState().sites.pickup).toBeUndefined();
  },
);

it('авторазведка не зацикливается на беженцах при полном населении', () => {
  const scout = useUnitsStore.getState().spawnUnit('scout', 5, 5, 'p2', true)!;
  useSitesStore
    .getState()
    .setSites([{ id: 'ref', type: 'refugees', x: 5, y: 3 }]);
  const cap = useEconomyStore.getState().populationCap.p2;
  useEconomyStore.getState().addUnit('p2', cap.max - cap.occupied);
  expect(
    getExplorationTarget(useUnitsStore.getState().units[scout], 'p2')?.path.at(
      -1,
    ),
  ).not.toEqual({ x: 5, y: 3 });
  expect(autoExplore({ actor: 'p2', unitId: scout }).ok).toBe(true);
});

it('авторазведка собирает находку даже после полного исследования карты', () => {
  const scout = useUnitsStore.getState().spawnUnit('scout', 5, 5, 'p2', true)!;
  useSitesStore
    .getState()
    .setSites([
      { id: 'cache', type: 'cache', x: 5, y: 3, resource: 'gold', amount: 90 },
    ]);
  const knowledge = useKnowledgeStore.getState().byParticipant.p2!;
  useKnowledgeStore.setState({
    byParticipant: {
      ...useKnowledgeStore.getState().byParticipant,
      p2: { ...knowledge, terrain: new Uint8Array(400).fill(1) },
    },
  });
  expect(autoExplore({ actor: 'p2', unitId: scout }).ok).toBe(true);
  expect(useSitesStore.getState().sites.cache).toBeUndefined();
});

it('полный набор правил ИИ собирает находку и занимает руины разведчиком', async () => {
  useUnitsStore.getState().spawnUnit('scout', 5, 5, 'p2', true);
  useUnitsStore.getState().resetUnitsForNewTurn('p2');
  useSitesStore.getState().setSites([
    { id: 'cache', type: 'cache', x: 5, y: 4, resource: 'gold', amount: 90 },
    { id: 'ruins', type: 'ruins', x: 6, y: 5 },
  ]);
  const result = await run();
  expect(result.reason).not.toBe('повторные отказы команд');
  expect(useSitesStore.getState().sites).toEqual({});
  expect(useBuildingsStore.getState().getBuildingAt(6, 5)?.type).toBe(
    'outpost',
  );
});

it('разведчик оставляет костёр, рабочий выбирает богатую жилу и запускает рудник', async () => {
  useMapStore
    .getState()
    .setCell(12, 5, { type: 'gold', isWalkable: false, rich: true });
  useMapStore.getState().setCell(10, 5, { type: 'gold', isWalkable: false });
  useUnitsStore.getState().spawnUnit('scout', 11, 5, 'p2', true);
  const worker = useUnitsStore
    .getState()
    .spawnUnit('worker', 4, 5, 'p2', true)!;
  useUnitsStore.getState().resetUnitsForNewTurn('p2');
  expect(getObservation('p2').knownRichGold?.[5][12]).toBe(true);
  const result = await run(['R09', 'W05', 'W02']);
  expect(result.reason).not.toBe('повторные отказы команд');
  expect(
    Object.values(useBuildingsStore.getState().buildings).some(
      b => b.type === 'beacon',
    ),
  ).toBe(true);
  expect(nextTurn('p2').ok).toBe(true);
  expect(nextTurn('p1').ok).toBe(true);
  const next = await run(['R09', 'W05', 'W02'], result.memory);
  expect(next.reason).not.toBe('повторные отказы команд');
  const mine = useBuildingsStore.getState().getBuildingAt(12, 5);
  expect(mine).toMatchObject({ type: 'mine', owner: 'p2' });
  expect(useUnitsStore.getState().units[worker]).toMatchObject({
    workplaceId: mine?.id,
  });
});

it('R08 действительно собирает тайник через общую команду движения', async () => {
  const scout = useUnitsStore.getState().spawnUnit('scout', 2, 3, 'p2', true)!;
  useSitesStore
    .getState()
    .setSites([
      { id: 'cache', type: 'cache', x: 5, y: 3, resource: 'gold', amount: 90 },
    ]);
  const before = useEconomyStore.getState().resources.p2.gold;
  expect(getObservation('p2').sites).toEqual([
    { id: 'cache', type: 'cache', x: 5, y: 3 },
  ]);
  const result = await run(['R08']);
  expect(result.reason).not.toBe('повторные отказы команд');
  expect(useSitesStore.getState().sites).toEqual({});
  expect(useEconomyStore.getState().resources.p2.gold).toBe(before + 90);
  expect(useUnitsStore.getState().units[scout]).toMatchObject({ x: 5, y: 3 });
});

it('наблюдение хранит старый запас лагеря, скрытые находки не передаёт', () => {
  const scout = useUnitsStore.getState().spawnUnit('scout', 3, 3, 'p2', true)!;
  useSitesStore.getState().setSites([
    { id: 'camp', type: 'camp', x: 5, y: 3, hiresLeft: 3 },
    {
      id: 'hidden',
      type: 'cache',
      x: 18,
      y: 10,
      amount: 120,
      resource: 'gold',
    },
  ]);
  useUnitsStore.getState().placeUnit(scout, 1, 12);
  useSitesStore.getState().consumeCampHire('camp');
  expect(getObservation('p2').sites).toEqual([
    { id: 'camp', type: 'camp', x: 5, y: 3, hiresLeft: 3 },
  ]);
});

it('реальная команда R08 обходит опасность на всём оплаченном пути', async () => {
  const scout = useUnitsStore.getState().spawnUnit('scout', 1, 6, 'p2', true)!;
  useUnitsStore.getState().spawnUnit('archer', 7, 6, 'p1', true);
  useBuildingsStore.getState().spawnBuilding('beacon', 14, 7, 'p2', 10);
  useSitesStore
    .getState()
    .setSites([
      { id: 'cache', type: 'cache', x: 14, y: 6, resource: 'gold', amount: 90 },
    ]);
  const positions: { x: number; y: number }[] = [];
  const off = useUnitsStore.subscribe(state => {
    const unit = state.units[scout];
    if (unit) positions.push({ x: unit.x, y: unit.y });
  });
  try {
    const result = await run(['R08']);
    expect(result.commands).toBeGreaterThan(0);
    expect(positions.length).toBeGreaterThan(0);
    expect(
      positions.every(p => Math.abs(p.x - 7) + Math.abs(p.y - 6) > 5),
    ).toBe(true);
  } finally {
    off();
  }
});

it('N05 расходует реальный общий запас и золото, новобранцы без действий', async () => {
  useGameLoopStore.setState({ currentTurn: 15 });
  useUnitsStore.getState().spawnUnit('scout', 5, 5, 'p2', true);
  useSitesStore
    .getState()
    .setSites([{ id: 'camp', type: 'camp', x: 6, y: 5, hiresLeft: 3 }]);
  const before = useEconomyStore.getState().resources.p2.gold;
  await run(['N05']);
  const hired = Object.values(useUnitsStore.getState().units).filter(
    u => u.type !== 'scout',
  );
  expect(hired).toHaveLength(3);
  expect(
    hired.every(
      u => u.movePoints === 0 && u.role === 'military' && u.attackPoints === 0,
    ),
  ).toBe(true);
  expect(useSitesStore.getState().sites.camp).toMatchObject({ hiresLeft: 0 });
  expect(useEconomyStore.getState().resources.p2.gold).toBe(before - 754);
});

it('авторазведка предпочитает неизвестный сектор рядом с известной находкой', () => {
  const id = useUnitsStore.getState().spawnUnit('scout', 5, 5, 'p2', true)!;
  const unit = useUnitsStore.getState().units[id];
  const before = getExplorationTarget(unit, 'p2')!.path.at(-1)!;
  useSitesStore
    .getState()
    .setSites([{ id: 'ruins', type: 'ruins', x: 5, y: 7 }]);
  const after = getExplorationTarget(unit, 'p2')!.path.at(-1)!;
  const distance = (p: { x: number; y: number }) =>
    Math.abs(p.x - 5) + Math.abs(p.y - 7);
  expect(distance(after)).toBeLessThan(distance(before));
  const k = useKnowledgeStore.getState().byParticipant.p2!;
  expect(k.terrain[after.y * k.width + after.x]).toBe(0);
  useSitesStore.getState().setSites([
    {
      id: 'hidden',
      type: 'cache',
      x: 18,
      y: 10,
      resource: 'gold',
      amount: 120,
    },
  ]);
  // Видимые руины исчезли: предпочтение возвращается к ближайшей границе.
  expect(getExplorationTarget(unit, 'p2')!.path.at(-1)).toEqual(before);
});

it.each(['swordsman', 'scout'] as const)(
  'M08 создаёт аванпост юнитом %s и тратит действие',
  async type => {
    const unit = useUnitsStore.getState().spawnUnit(type, 4, 4, 'p2', true)!;
    useUnitsStore.getState().resetUnitsForNewTurn('p2');
    useSitesStore
      .getState()
      .setSites([{ id: 'ruins', type: 'ruins', x: 5, y: 5 }]);
    await run(['M08']);
    expect(useSitesStore.getState().sites).toEqual({});
    expect(useBuildingsStore.getState().getBuildingAt(5, 5)).toMatchObject({
      type: 'outpost',
      owner: 'p2',
    });
    expect(useUnitsStore.getState().units[unit]).toMatchObject({
      attackPoints: 0,
    });
  },
);

it('R09 создаёт костёр штатной командой после разведки карты', async () => {
  useUnitsStore.getState().spawnUnit('scout', 5, 5, 'p2', true);
  useUnitsStore.getState().resetUnitsForNewTurn('p2');
  const k = useKnowledgeStore.getState().byParticipant.p2!;
  useKnowledgeStore.setState({
    byParticipant: {
      ...useKnowledgeStore.getState().byParticipant,
      p2: { ...k, terrain: new Uint8Array(400).fill(1) },
    },
  });
  const before = useEconomyStore.getState().resources.p2.wood;
  const result = await run(['R09']);
  expect(result.commands).toBe(1);
  expect(
    Object.values(useBuildingsStore.getState().buildings).filter(
      b => b.type === 'beacon',
    ),
  ).toHaveLength(1);
  expect(useEconomyStore.getState().resources.p2.wood).toBe(before - 30);
});

it('R04 ждёт один раз и получает маскировку в начале следующего своего хода', async () => {
  const scout = useUnitsStore.getState().spawnUnit('scout', 2, 5, 'p2', true)!;
  useUnitsStore.getState().spawnUnit('swordsman', 8, 5, 'p1', true);
  useUnitsStore.getState().spawnUnit('swordsman', 7, 6, 'p1', true);
  const result = await run(['R04']);
  expect(result.commands).toBe(1);
  expect(useUnitsStore.getState().units[scout]).toMatchObject({ x: 2, y: 5 });
  expect(nextTurn('p2').ok).toBe(true);
  expect(nextTurn('p1').ok).toBe(true);
  expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
});

it('R06 без пути отхода ждёт и получает маскировку в следующий свой ход', async () => {
  for (const [x, y] of [
    [1, 5],
    [3, 5],
    [2, 4],
    [2, 6],
  ])
    useMapStore.getState().setCell(x, y, { type: 'water', isWalkable: false });
  const scout = useUnitsStore.getState().spawnUnit('scout', 2, 5, 'p2', true)!;
  useUnitsStore.getState().spawnUnit('archer', 4, 5, 'p1', true);
  const result = await run(['R06']);
  expect(result.commands).toBe(1);
  expect(useUnitsStore.getState().units[scout]).toMatchObject({ x: 2, y: 5 });
  expect(nextTurn('p2').ok).toBe(true);
  expect(nextTurn('p1').ok).toBe(true);
  expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
});
