import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant } from '@shared/config';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useGameLoopStore } from '@entities/games';
import { getParticipantKnowledge } from '@entities/perceptions';
import { nextTurn, resetGame } from '@features/game-loop';
import { getObservation, initVisibilitySystem } from '@features/visibility';
import { attack, prepareStrike } from '@features/combat';
import { getPlacementRejection } from '@features/build';
import { useJournalStore } from '@entities/journals';
import {
  createKnownMovementGrid,
  createLandingCheck,
  getEnemyTargets,
  getSeenEnemies,
  getExplorationDanger,
  getActorVisibility,
  move,
} from '@features/pathfinding';
import { buildScene, diffScene, isInCombat } from '@widgets/map';
import { initPopulationSystem, initJournalSystem } from '@app/system';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 2 },
  { id: 'p3', controller: 'ai', team: 1 },
];
let scout: string, enemy: string, ally: string;
const world = () => ({
  grid: useMapStore.getState().grid,
  units: useUnitsStore.getState().units,
  buildings: useBuildingsStore.getState().buildings,
  sites: {},
});
const scene = () =>
  buildScene(world(), {
    mode: 'participant',
    viewer: 'p2',
    knowledge: getParticipantKnowledge('p2'),
  });
const round = () => {
  for (const p of participants) expect(nextTurn(p.id).ok).toBe(true);
};
beforeEach(() => {
  initPopulationSystem();
  initJournalSystem();
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
    activePlayer: 'p1',
    currentTurn: 1,
    eliminated: [],
  });
  scout = useUnitsStore.getState().spawnUnit('scout', 6, 6, 'p1', true)!;
  enemy = useUnitsStore.getState().spawnUnit('mage', 6, 9, 'p2', true)!;
  ally = useUnitsStore.getState().spawnUnit('worker', 12, 12, 'p3', true)!;
});
afterEach(resetGame);

it('план строительства не выдаёт скрытую занятость разведчиком', () => {
  const worker = useUnitsStore
    .getState()
    .spawnUnit('worker', 7, 9, 'p2', true)!;
  round();
  expect(
    getPlacementRejection(
      useUnitsStore.getState().units[worker],
      'p2',
      'farm',
      { x: 6, y: 6 },
    ),
  ).toBeNull();
});

it.each([45, 1])(
  'слепой удар по клетке не раскрывает скрытого разведчика с %s HP в отчёте и журнале',
  hp => {
    const siege = useUnitsStore
      .getState()
      .spawnUnit('siege', 6, 10, 'p2', true)!;
    round();
    useUnitsStore.getState().damageUnit(scout, 45 - hp);
    useGameLoopStore.setState({ activePlayer: 'p2' });
    expect(prepareStrike({ actor: 'p2', unitId: siege, x: 6, y: 6 }).ok).toBe(
      true,
    );
    for (const actor of ['p2', 'p3', 'p1'] as const)
      expect(nextTurn(actor).ok).toBe(true);
    if (hp === 1) expect(useUnitsStore.getState().units[scout]).toBeUndefined();
    else {
      expect(useUnitsStore.getState().units[scout].hp).toBeLessThan(hp);
      expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
    }
    const strike = useJournalStore
      .getState()
      .entries.findLast(e => e.type === 'strike');
    expect(strike?.details?.hits).toBe('пусто');
    const observations = useJournalStore
      .getState()
      .entries.filter(
        e => e.type === 'attackObserved' || e.type === 'unitDestroyed',
      );
    expect(observations).toHaveLength(hp === 1 ? 2 : 1);
    for (const entry of observations) {
      expect(entry.visibleTo).not.toBe('all');
      expect(entry.visibleTo).not.toContain('p2');
    }
  },
);

it('неподвижный разведчик скрывается от целей, ИИ, сцены и музыки; исчезновение не считается гибелью', () => {
  const before = scene();
  expect(before.units[scout]).toBeDefined();
  round();
  expect(useUnitsStore.getState().units[scout]).toHaveProperty(
    'concealed',
    true,
  );
  expect(getParticipantKnowledge('p2')!.visible[126]).toBe(1);
  expect(getObservation('p2').visibleEnemies.some(u => u.id === scout)).toBe(
    false,
  );
  expect(getParticipantKnowledge('p2')!.contacts[scout]).toBeUndefined();
  expect(getEnemyTargets('p2').some(u => u.id === scout)).toBe(false);
  expect(getSeenEnemies('p2').has(scout)).toBe(false);
  expect(
    getExplorationDanger('p2', 20, 20, getActorVisibility('p2'))[126],
  ).toBe(0);
  const after = scene();
  expect(after.units[scout]).toBeUndefined();
  expect(isInCombat(Object.values(after.units), [], 'p2')).toBe(false);
  const context = {
    firstRun: true,
    knownIds: new Set(Object.keys(world().units)),
    worldIds: new Set(Object.keys(world().units)),
    isVisible: () => true,
    humanId: 'p2' as const,
  };
  const tracked = diffScene(
    new Map(),
    Object.values(before.units),
    context,
  ).tracked;
  expect(
    diffScene(tracked, Object.values(after.units), {
      ...context,
      firstRun: false,
    }).events,
  ).toEqual([]);
  useGameLoopStore.setState({ activePlayer: 'p2' });
  expect(attack({ actor: 'p2', attackerId: enemy, targetId: scout }).ok).toBe(
    false,
  );
  expect(useUnitsStore.getState().units[scout].hp).toBe(45);
});

it('сон и пропуск позволяют скрыться, движение снимает маскировку и откладывает её на полный ход', () => {
  useUnitsStore.getState().setRestMode(scout, 'skip');
  round();
  expect(useUnitsStore.getState().units[scout]).toHaveProperty(
    'concealed',
    true,
  );
  expect(move({ actor: 'p1', unitId: scout, x: 5, y: 6 }).ok).toBe(true);
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
  round();
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
  useUnitsStore.getState().setRestMode(scout, 'sleep');
  round();
  expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
});

it('союзник рядом не раскрывает; враг обнаруживает на расстоянии 1 и маскировка не возвращается при его отходе', () => {
  useUnitsStore.getState().placeUnit(ally, 6, 5);
  round();
  expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
  // Союзник уже проверен; его новое появление в обзоре не должно останавливать маршрут врага.
  useUnitsStore.getState().placeUnit(ally, 12, 12);
  useGameLoopStore.setState({ activePlayer: 'p2' });
  expect(createKnownMovementGrid('p2')[6][6]).toBe(1);
  expect(createLandingCheck('p2')({ x: 6, y: 6 })).toBe(true);
  expect(move({ actor: 'p2', unitId: enemy, x: 6, y: 6 }).ok).toBe(true);
  expect(useUnitsStore.getState().units[enemy].y).toBe(7);
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
  expect(scene().units[scout]).toBeDefined();
  expect(move({ actor: 'p2', unitId: enemy, x: 6, y: 8 }).ok).toBe(true);
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
});

it('атака мешает скрыться на следующем своём ходу, неудачная команда не снимает маскировку', () => {
  round();
  expect(move({ actor: 'p1', unitId: scout, x: -1, y: 6 }).ok).toBe(false);
  expect(useUnitsStore.getState().units[scout].concealed).toBe(true);
  useUnitsStore.getState().placeUnit(enemy, 6, 7);
  expect(attack({ actor: 'p1', attackerId: scout, targetId: enemy }).ok).toBe(
    true,
  );
  useUnitsStore.getState().placeUnit(enemy, 6, 9);
  round();
  expect(useUnitsStore.getState().units[scout].concealed).toBeUndefined();
});
