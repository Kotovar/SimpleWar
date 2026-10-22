import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { START_RESOURCES, type AiSetup } from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useMapStore } from '@entities/maps';
import { useEconomyStore } from '@entities/economies';
import { resetGame } from '@features/game-loop';
import { initializeStandardGame } from './initializeStandardGame';

const setups: AiSetup[] = [
  { profile: 'aggressive', difficulty: 'hard' },
  { profile: 'economic', difficulty: 'easy' },
  { profile: 'defensive', difficulty: 'normal' },
];

describe('запуск обычной партии из настроек меню', () => {
  beforeEach(() => {
    resetGame();
    useSettingsStore.setState({ mapGenerationMode: 'fixed', customSeed: 43 });
  });

  it.each([1, 2, 3])(
    'создаёт человека и %s ИИ со своими настройками',
    count => {
      useSettingsStore.setState({ aiSetups: setups.slice(0, count) });
      const participants = initializeStandardGame();
      expect(participants).not.toBeNull();
      useGameLoopStore.getState().startGame(participants!);
      expect(useGameLoopStore.getState()).toMatchObject({
        phase: 'inProgress',
        activePlayer: 'p1',
        participants: [
          { id: 'p1', controller: 'human', team: 1 },
          ...[
            { id: 'p2', controller: 'ai', ai: setups[0], team: 2 },
            { id: 'p3', controller: 'ai', ai: setups[1], team: 3 },
            { id: 'p4', controller: 'ai', ai: setups[2], team: 4 },
          ].slice(0, count),
        ],
      });
      expect(
        Object.values(useBuildingsStore.getState().buildings),
      ).toHaveLength(count + 1);
      expect(Object.values(useUnitsStore.getState().units)).toHaveLength(
        count + 1,
      );
      expect(useEconomyStore.getState().resources).toMatchObject({
        p1: START_RESOURCES.p1,
        p2: { gold: 350, wood: 220 },
        ...(count >= 2 ? { p3: { gold: 120, wood: 60 } } : {}),
        ...(count === 3 ? { p4: START_RESOURCES.p4 } : {}),
      });
    },
  );

  it.each([
    [24, 24],
    [30, 24],
    [24, 30],
  ])('отклоняет карту %s × %s для нескольких ИИ', (columns, rows) => {
    useSettingsStore.setState({
      gridColumns: columns,
      gridRows: rows,
      aiSetups: setups,
    });
    expect(initializeStandardGame()).toBeNull();
    expect(useGameLoopStore.getState()).toMatchObject({
      phase: 'setup',
      startError: expect.stringContaining('30 × 30'),
    });
    expect(useMapStore.getState().grid).toEqual([]);
    expect(useBuildingsStore.getState().buildings).toEqual({});
    expect(useUnitsStore.getState().units).toEqual({});
  });

  it('разрешает Маленькую карту с одним противником', () => {
    useSettingsStore.getState().setGridSize(15, 15);
    expect(initializeStandardGame()).toHaveLength(2);
  });

  it('закрепляет разные цвета участников, сохраняя ручной выбор', () => {
    useSettingsStore.getState().setAiCount(3);
    useSettingsStore.getState().setPaletteChoice('p1', 'green');
    useSettingsStore.getState().setPaletteChoice('p2', 'random');
    useSettingsStore.getState().setPaletteChoice('p3', 'random');
    useSettingsStore.getState().setPaletteChoice('p4', 'pink');
    const participants = initializeStandardGame()!;
    expect(participants[0].palette).toBe('green');
    expect(participants[3].palette).toBe('pink');
    expect(new Set(participants.map(p => p.palette)).size).toBe(4);
  });
});
