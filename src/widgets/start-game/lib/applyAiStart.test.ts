import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  AI_DIFFICULTY,
  START_RESOURCES,
  type AiDifficulty,
  type Participant,
} from '@shared/config';
import { useEconomyStore } from '@entities/economies';
import { useSettingsStore } from '@entities/settings';
import { resetGame } from '@features/game-loop';
import { initializeGame } from './initializeGame';

const ai = (id: Participant['id'], difficulty: AiDifficulty): Participant => ({
  id,
  controller: 'ai',
  ai: { profile: 'economic', difficulty },
});
const human: Participant = { id: 'p1', controller: 'human' };

/** Ожидаемый запас: обычный старт плюс прибавка пресета. */
const expected = (id: Participant['id'], difficulty: AiDifficulty) => ({
  gold: START_RESOURCES[id].gold + AI_DIFFICULTY[difficulty].stockBonus.gold,
  wood: START_RESOURCES[id].wood + AI_DIFFICULTY[difficulty].stockBonus.wood,
});

const stock = () => useEconomyStore.getState().resources;

describe('сложность: стартовые запасы ИИ', () => {
  beforeEach(() => {
    resetGame();
    useSettingsStore.setState({
      mapGenerationMode: 'fixed',
      customSeed: 7,
      gridColumns: 24,
      gridRows: 24,
    });
  });

  it('обычный пресет симметричен игроку', () => {
    expect(initializeGame([human, ai('p2', 'normal')])).toBe(true);

    expect(stock().p2).toEqual(stock().p1);
  });

  it('два ИИ получают свои пресеты, игрок — обычный старт', () => {
    const participants = [human, ai('p2', 'hard'), ai('p3', 'easy')];

    expect(initializeGame(participants)).toBe(true);
    expect(stock().p1).toEqual(START_RESOURCES.p1);
    expect(stock().p2).toEqual(expected('p2', 'hard'));
    expect(stock().p3).toEqual(expected('p3', 'easy'));
  });

  it('неизвестный пресет — обычный старт', () => {
    const odd: Participant = {
      ...human,
      id: 'p2',
      controller: 'ai',
      ai: { profile: 'economic', difficulty: 'nightmare' as AiDifficulty },
    };

    expect(initializeGame([human, odd])).toBe(true);
    expect(stock().p2).toEqual(START_RESOURCES.p2);
  });

  it('повторная инициализация не начисляет бонус ещё раз', () => {
    const participants = [human, ai('p2', 'hard')];
    initializeGame(participants);
    useEconomyStore.getState().removeResources('p2', { gold: 50, wood: 0 });

    expect(initializeGame(participants)).toBe(false);
    expect(stock().p2.gold).toBe(expected('p2', 'hard').gold - 50);
  });
});
