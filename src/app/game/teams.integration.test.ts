import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_AI_SETUP,
  type Participant,
  type ParticipantId,
  type UnitType,
} from '@shared/config';
import { getRelation, isHostile } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { useMapStore } from '@entities/maps';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { getParticipantKnowledge } from '@entities/perceptions';
import { useSettingsStore } from '@entities/settings';
import { initVisibilitySystem, getObservation } from '@features/visibility';
import {
  initGameLoopEvents,
  nextTurn,
  resetGame,
  surrender,
} from '@features/game-loop';
import { attack, heal, getHealTargets } from '@features/combat';
import { move, getEnemyTargets, useMovementStore } from '@features/pathfinding';
import { build } from '@features/build';
import { initializeStandardGame } from '@widgets/start-game';
import { initPopulationSystem } from '@app/system';
import { runAITurn } from './ai';

const sides: Participant[] = [
  { id: 'p1', controller: 'human', team: 1 },
  { id: 'p2', controller: 'ai', ai: DEFAULT_AI_SETUP, team: 1 },
  { id: 'p3', controller: 'ai', ai: DEFAULT_AI_SETUP, team: 2 },
  { id: 'p4', controller: 'ai', ai: DEFAULT_AI_SETUP, team: 2 },
];
const unit = (type: UnitType, x: number, y: number, owner: ParticipantId) => {
  const store = useUnitsStore.getState();
  const id = store.spawnUnit(type, x, y, owner, true)!;
  store.resetUnitsForNewTurn(owner);
  return id;
};

beforeEach(() => {
  initPopulationSystem();
  initGameLoopEvents();
  initVisibilitySystem();
  resetGame();
  useMapStore.getState().setGrid(
    Array.from({ length: 30 }, (_, y) =>
      Array.from({ length: 30 }, (_, x) => ({
        x,
        y,
        type: 'grass',
        isWalkable: true,
      })),
    ),
    43,
  );
  useGameLoopStore.getState().startGame(sides);
  for (const [i, p] of sides.entries()) {
    useBuildingsStore
      .getState()
      .spawnBuilding(
        'base',
        1 + (i % 2) * 26,
        1 + Math.floor(i / 2) * 26,
        p.id,
      );
  }
});

describe('P02: постоянные команды', () => {
  it('различает своего, союзника и врага; без команды все разные участники враждебны', () => {
    expect(getRelation('p1', 'p1', sides)).toBe('own');
    expect(getRelation('p1', 'p2', sides)).toBe('allied');
    expect(isHostile('p1', 'p3', sides)).toBe(true);
    expect(isHostile('p1', 'p2')).toBe(true);
  });

  it('общий обзор открывает врага через союзника, скрытый враг остаётся неизвестным', () => {
    unit('scout', 15, 15, 'p2');
    const seen = unit('swordsman', 17, 15, 'p3');
    const hidden = unit('swordsman', 15, 29, 'p4');
    for (const owner of ['p1', 'p2'] as const) {
      const obs = getObservation(owner);
      expect(obs.opponents).toEqual(['p3', 'p4']);
      expect(obs.visibleEnemies.map(e => e.id)).toContain(seen);
      expect(obs.visibleEnemies.map(e => e.id)).not.toContain(hidden);
      expect(
        obs.visibleEnemies.some(e => e.owner === 'p1' || e.owner === 'p2'),
      ).toBe(false);
    }
    expect(getParticipantKnowledge('p1')?.terrain).toEqual(
      getParticipantKnowledge('p2')?.terrain,
    );
    expect(getObservation('p3').visibleEnemies.map(e => e.id)).not.toContain(
      hidden,
    );
  });

  it('обычная атака союзника отклоняется без расхода очков и HP; союзником командовать нельзя', () => {
    const own = unit('swordsman', 8, 8, 'p1');
    const ally = unit('swordsman', 9, 8, 'p2');
    const before = useUnitsStore.getState().units;
    expect(
      attack({ actor: 'p1', attackerId: own, targetId: ally }),
    ).toMatchObject({ ok: false, code: 'target' });
    expect(useUnitsStore.getState().units).toEqual(before);
    expect(move({ actor: 'p1', unitId: ally, x: 9, y: 9 })).toMatchObject({
      ok: false,
      code: 'owner',
    });
    expect(getEnemyTargets('p1').some(target => target.id === ally)).toBe(
      false,
    );
  });

  it('лекарь лечит союзника: подсветка и команда используют одно правило', () => {
    const healer = unit('healer', 8, 8, 'p1');
    const ally = unit('swordsman', 9, 8, 'p2');
    useUnitsStore.getState().damageUnit(ally, 20);
    const before = useUnitsStore.getState().units[ally].hp;
    useMovementStore.getState().calculateActionHighlights(healer);
    expect(useMovementStore.getState().healTargets?.map(u => u.id)).toContain(
      ally,
    );
    expect(
      getHealTargets(
        useUnitsStore.getState().units[healer],
        Object.values(useUnitsStore.getState().units),
      ).map(u => u.id),
    ).toContain(ally);
    expect(heal({ actor: 'p1', healerId: healer, targetId: ally }).ok).toBe(
      true,
    );
    expect(useUnitsStore.getState().units[ally].hp).toBe(before + 12);
    expect(useUnitsStore.getState().units[healer]).toMatchObject({
      attackPoints: 0,
    });
  });

  it('юниты проходят через союзников, но не останавливаются на занятой клетке', () => {
    const own = unit('swordsman', 8, 8, 'p1');
    unit('worker', 9, 8, 'p2');
    expect(move({ actor: 'p1', unitId: own, x: 9, y: 8 })).toMatchObject({
      ok: false,
      code: 'occupied',
    });
    expect(move({ actor: 'p1', unitId: own, x: 10, y: 8 }).ok).toBe(true);
    expect(useUnitsStore.getState().units[own]).toMatchObject({
      x: 10,
      y: 8,
      movePoints: 1,
    });
  });

  it('стройка списывает только ресурсы владельца', () => {
    const worker = unit('worker', 10, 10, 'p1');
    unit('scout', 15, 10, 'p2');
    useEconomyStore.getState().addResources('p1', { gold: 500, wood: 500 });
    const before = structuredClone(useEconomyStore.getState().resources);
    expect(
      build({
        actor: 'p1',
        workerId: worker,
        buildingType: 'farm',
        x: 11,
        y: 10,
      }),
    ).toEqual({ ok: true });
    expect(useEconomyStore.getState().resources.p1.gold).toBeLessThan(
      before.p1.gold,
    );
    expect(useEconomyStore.getState().resources.p2).toEqual(before.p2);
  });

  it('доход начисляется только закончившему ход, ход союзника не даёт второй доход', () => {
    const before = structuredClone(useEconomyStore.getState().resources);
    expect(nextTurn('p1').ok).toBe(true);
    expect(useEconomyStore.getState().resources.p2).toEqual(before.p2);
    const ownAfter = useEconomyStore.getState().resources.p1;
    expect(nextTurn('p2').ok).toBe(true);
    expect(useEconomyStore.getState().resources.p1).toEqual(ownAfter);
  });

  it('потеря человеческой базы оставляет наблюдение и союзную очередь; команда побеждает целиком', () => {
    expect(surrender('p1').ok).toBe(true);
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'inProgress',
      activePlayer: 'p2',
      winner: null,
    });
    unit('scout', 15, 15, 'p2');
    expect(getParticipantKnowledge('p1')?.visible[15 * 30 + 15]).toBe(1);
    expect(surrender('p3').ok).toBe(true);
    expect(useGameLoopStore.getState().phase).toBe('inProgress');
    expect(surrender('p4').ok).toBe(true);
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'gameOver',
      winner: 'p2',
    });
  });

  it('двое живых союзников завершают матч после выбывания последнего врага', () => {
    surrender('p3');
    surrender('p4');
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'gameOver',
      winner: 'p1',
      eliminated: ['p3', 'p4'],
    });
  });

  it('меню переносит команды в обычную партию и отклоняет матч без врагов', () => {
    resetGame();
    const settings = useSettingsStore.getState();
    settings.setAiCount(2);
    settings.setTeamChoice('p1', 1);
    settings.setTeamChoice('p2', 1);
    settings.setTeamChoice('p3', 2);
    expect(initializeStandardGame()?.map(p => p.team)).toEqual([1, 1, 2]);
    resetGame();
    useSettingsStore.getState().setTeamChoice('p1', 1);
    useSettingsStore.getState().setTeamChoice('p2', 1);
    expect(initializeStandardGame()).toBeNull();
    expect(useGameLoopStore.getState().startError).toContain(
      'вражескую сторону',
    );
    expect(useUnitsStore.getState().units).toEqual({});
  });

  it('ИИ выбирает только врагов и лечит раненого союзника реальной командой', async () => {
    const healer = unit('healer', 14, 14, 'p2');
    const ally = unit('swordsman', 15, 14, 'p1');
    useUnitsStore.getState().damageUnit(ally, 20);
    nextTurn('p1');
    await runAITurn('p2', { yieldControl: () => Promise.resolve() });
    expect(useUnitsStore.getState().units[ally].hp).toBe(102);
    expect(useUnitsStore.getState().units[healer]).toMatchObject({
      attackPoints: 0,
    });
  });
});
