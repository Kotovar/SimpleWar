import { afterEach, beforeEach, expect, it } from 'vite-plus/test';
import type { Cell, Participant, Site, UnitType } from '@shared/config';
import { gameEvents } from '@shared/lib';
import { useSitesStore } from '@entities/sites';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useGameLoopStore } from '@entities/games';
import { getParticipantKnowledge } from '@entities/perceptions';
import { getVisibleRecords, useJournalStore } from '@entities/journals';
import { resetGame } from '@features/game-loop';
import { autoExplore, goTo, move } from '@features/pathfinding';
import { initVisibilitySystem } from '@features/visibility';
import { initJournalSystem, initPopulationSystem } from '@app/system';

const participants: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', team: 1 },
  { id: 'p3', controller: 'ai', team: 2 },
];
const grid = (width = 32, height = 9): Cell[][] =>
  Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      type: 'grass',
      isWalkable: true,
    })),
  );
const units = () => useUnitsStore.getState();
const ready = (type: UnitType = 'scout', x = 1, y = 4) =>
  units().spawnUnit(type, x, y, 'p1', true)!;
const cache = (resource: 'gold' | 'wood' = 'gold'): Site => ({
  id: 'cache',
  type: 'cache',
  x: 2,
  y: 4,
  resource,
  amount: 100,
});
const entries = () => useJournalStore.getState().entries;

beforeEach(() => {
  initPopulationSystem();
  initJournalSystem();
  initVisibilitySystem();
  resetGame();
  useMapStore.setState({ grid: grid() });
  useGameLoopStore.setState({
    participants,
    phase: 'inProgress',
    activePlayer: 'p1',
    currentTurn: 1,
    eliminated: [],
  });
});
afterEach(resetGame);

it.each(['worker', 'swordsman', 'scout'] as const)(
  'находку при проходе собирает только разведчик: %s',
  type => {
    const id = ready(type);
    useSitesStore.getState().setSites([cache()]);
    const before = structuredClone(useEconomyStore.getState().resources);
    const claimed: string[] = [];
    const off = gameEvents.subscribe(event => {
      if (event.type === 'SITE_CLAIMED') claimed.push(event.site.id);
    });
    try {
      expect(move({ actor: 'p1', unitId: id, x: 4, y: 4 }).ok).toBe(true);
      expect(units().units[id]).toMatchObject({ x: 4, y: 4 });
      expect(useEconomyStore.getState().resources.p1.gold).toBe(
        before.p1.gold + (type === 'scout' ? 100 : 0),
      );
      expect(useEconomyStore.getState().resources.p2).toEqual(before.p2);
      expect(useEconomyStore.getState().resources.p3).toEqual(before.p3);
      expect(claimed).toEqual(type === 'scout' ? ['cache'] : []);
      expect(!!useSitesStore.getState().sites.cache).toBe(type !== 'scout');
      expect(
        getVisibleRecords(entries(), 'p2').some(e => e.type === 'siteClaimed'),
      ).toBe(false);
    } finally {
      off();
    }
  },
);

it.each(['gold', 'wood'] as const)(
  'тайник начисляет %s ровно один раз и пишет частный журнал',
  resource => {
    const id = ready();
    useSitesStore.getState().setSites([cache(resource)]);
    const before = useEconomyStore.getState().resources.p1[resource];
    expect(goTo({ actor: 'p1', unitId: id, x: 4, y: 4 }).ok).toBe(true);
    units().resetUnitsForNewTurn('p1');
    expect(move({ actor: 'p1', unitId: id, x: 1, y: 4 }).ok).toBe(true);
    expect(useEconomyStore.getState().resources.p1[resource]).toBe(
      before + 100,
    );
    expect(entries().filter(e => e.type === 'siteClaimed')).toEqual([
      expect.objectContaining({
        actor: 'p1',
        visibleTo: ['p1'],
        details: expect.objectContaining({ resource, amount: 100 }),
      }),
    ]);
  },
);

it('собирает при авторазведке', () => {
  useMapStore.setState({ grid: grid(32, 1) });
  const id = ready('scout', 0, 0);
  useSitesStore.getState().setSites([{ ...cache(), x: 1, y: 0 }]);
  expect(autoExplore({ actor: 'p1', unitId: id }).ok).toBe(true);
  expect(useSitesStore.getState().sites).toEqual({});
  expect(units().units[id].x).toBe(5);
});

it('проход через союзника собирает находку только после оплаченного выхода', () => {
  useMapStore.setState({ grid: grid(12, 1) });
  const id = ready('scout', 0, 0);
  units().spawnUnit('worker', 1, 0, 'p2', true);
  units().spawnUnit('worker', 2, 0, 'p2', true);
  useSitesStore.getState().setSites([{ ...cache(), x: 1, y: 0 }]);
  useUnitsStore.setState(state => ({
    units: { ...state.units, [id]: { ...state.units[id], movePoints: 1 } },
  }));
  expect(move({ actor: 'p1', unitId: id, x: 3, y: 0, partial: true }).ok).toBe(
    false,
  );
  expect(useSitesStore.getState().sites).toHaveProperty('cache');
  units().resetUnitsForNewTurn('p1');
  expect(move({ actor: 'p1', unitId: id, x: 3, y: 0 }).ok).toBe(true);
  expect(useSitesStore.getState().sites).toEqual({});
  expect(units().units[id]).toMatchObject({ x: 3, movePoints: 2 });
});

it('беженцы дают бесплатного рабочего рядом и движение продолжается', () => {
  const id = ready();
  useSitesStore
    .getState()
    .setSites([{ id: 'refugees', type: 'refugees', x: 2, y: 4 }]);
  const before = structuredClone(useEconomyStore.getState().resources);
  expect(move({ actor: 'p1', unitId: id, x: 4, y: 4 }).ok).toBe(true);
  const worker = Object.values(units().units).find(u => u.type === 'worker')!;
  expect(worker).toMatchObject({ owner: 'p1', movePoints: 0 });
  expect(Math.max(Math.abs(worker.x - 2), Math.abs(worker.y - 4))).toBe(1);
  expect(useEconomyStore.getState().populationCap.p1.occupied).toBe(2);
  expect(useEconomyStore.getState().resources).toEqual(before);
  expect(units().units[id]).toMatchObject({ x: 4, y: 4 });
  expect(useSitesStore.getState().sites).toEqual({});
});

it('без населения беженцы остаются, сообщение объясняет отказ, движение продолжается', () => {
  const id = ready();
  useSitesStore
    .getState()
    .setSites([{ id: 'refugees', type: 'refugees', x: 2, y: 4 }]);
  useEconomyStore.getState().setPopulationSupply('p1', 1);
  expect(move({ actor: 'p1', unitId: id, x: 4, y: 4 }).ok).toBe(true);
  expect(Object.keys(units().units)).toEqual([id]);
  expect(useSitesStore.getState().sites).toHaveProperty('refugees');
  expect(
    entries().some(
      e => e.type === 'siteBlocked' && e.details?.reason === 'population',
    ),
  ).toBe(true);
  expect(units().units[id].x).toBe(4);
});

it('без свободного соседа беженцы остаются', () => {
  useMapStore.setState({ grid: grid(12, 1) });
  const id = ready('scout', 0, 0);
  ready('worker', 1, 0);
  ready('worker', 2, 0);
  useSitesStore
    .getState()
    .setSites([{ id: 'refugees', type: 'refugees', x: 2, y: 0 }]);
  expect(move({ actor: 'p1', unitId: id, x: 3, y: 0 }).ok).toBe(true);
  expect(useSitesStore.getState().sites).toHaveProperty('refugees');
  expect(
    entries().some(
      e => e.type === 'siteBlocked' && e.details?.reason === 'occupied',
    ),
  ).toBe(true);
  expect(Object.keys(units().units)).toHaveLength(3);
});

it('обелиск запоминает ромб радиуса 10 союзникам без обзора, контактов и находок', () => {
  const id = ready();
  useMapStore
    .getState()
    .setCell(12, 4, { type: 'gold', isWalkable: true, rich: true });
  useMapStore.getState().setCell(11, 4, { road: true });
  const enemy = units().spawnUnit('swordsman', 12, 4, 'p3', true)!;
  useSitesStore.getState().setSites([
    { id: 'obelisk', type: 'obelisk', x: 2, y: 4 },
    { id: 'hidden', type: 'ruins', x: 11, y: 4 },
  ]);
  expect(move({ actor: 'p1', unitId: id, x: 2, y: 4 }).ok).toBe(true);
  for (const owner of ['p1', 'p2'] as const) {
    const k = getParticipantKnowledge(owner)!;
    expect(k.terrain[4 * 32 + 12]).toBe(7);
    expect(k.terrain[4 * 32 + 11]).toBe(0x81);
    expect(k.terrain[4 * 32 + 13]).toBe(0);
    expect(k.visible[4 * 32 + 12]).toBe(0);
    expect(k.contacts).not.toHaveProperty(enemy);
    expect(k.sites).not.toHaveProperty('hidden');
  }
  expect(getParticipantKnowledge('p3')!.terrain[4 * 32 + 2]).toBe(0);
  expect(useSitesStore.getState().sites).not.toHaveProperty('obelisk');
  expect(useSitesStore.getState().sites).toHaveProperty('hidden');
  units().resetUnitsForNewTurn('p1');
  expect(move({ actor: 'p1', unitId: id, x: 3, y: 4 }).ok).toBe(true);
  expect(getParticipantKnowledge('p1')!.terrain[4 * 32 + 12]).toBe(7);
});

it('лагерь и руины не собираются при проходе', () => {
  const id = ready();
  const sites: Site[] = [
    { id: 'camp', type: 'camp', x: 2, y: 4, hiresLeft: 3 },
    { id: 'ruins', type: 'ruins', x: 3, y: 4 },
  ];
  useSitesStore.getState().setSites(sites);
  expect(move({ actor: 'p1', unitId: id, x: 4, y: 4 }).ok).toBe(true);
  expect(Object.values(useSitesStore.getState().sites)).toEqual(sites);
  expect(entries().some(e => e.type === 'siteClaimed')).toBe(false);
});

it('остановка при обнаружении врага не собирает находку дальше по маршруту', () => {
  const id = ready();
  units().spawnUnit('swordsman', 8, 4, 'p3', true);
  useSitesStore.getState().setSites([{ ...cache(), x: 4 }]);
  expect(move({ actor: 'p1', unitId: id, x: 4, y: 4 }).ok).toBe(true);
  expect(units().units[id]).toMatchObject({ x: 2, movePoints: 4 });
  expect(useSitesStore.getState().sites).toHaveProperty('cache');
  expect(entries().some(e => e.type === 'siteClaimed')).toBe(false);
});
