import { describe, expect, it } from 'vite-plus/test';
import { AI_CONFIG, AI_PROFILE_TYPES } from '@shared/config';
import { createTurnState } from './memory';
import { buildContext } from './context';
import { actionKey } from './decide';
import { AI_RULES } from './rules';
import { profileConfig } from './profile';
import { chooseStrategy, evaluateStrategies } from './strategy';
import { foe, grass, own, ownBuilding, scene } from './scene.test-utils';

/** Армия у базы, вооружённый враг на подходе, свободная площадка леса. */
const base = () =>
  scene({
    map: grass(16, 16),
    units: [
      own('worker', 0, 0),
      own('worker', 0, 1),
      own('swordsman', 3, 3),
      own('swordsman', 4, 3),
      own('archer', 3, 4),
    ],
    buildings: [ownBuilding('base', 1, 1), ownBuilding('barracks', 1, 4)],
    enemies: [foe('swordsman', 7, 7)],
    turn: 12,
    memory: {
      operation: { phase: 'gather', target: null, rally: null, since: 10 },
    },
  });

describe('profileConfig', () => {
  it('без профиля — нейтральные настройки', () => {
    expect(profileConfig()).toBe(AI_CONFIG);
  });

  it('профиль меняет только веса и пороги, не предел команд', () => {
    for (const profile of AI_PROFILE_TYPES) {
      const config = profileConfig(profile);
      expect(config.maxCommandsPerTurn).toBe(AI_CONFIG.maxCommandsPerTurn);
      expect(config.alertRadius).toBe(AI_CONFIG.alertRadius);
      expect(config.profile).toBe(profile);
    }
  });
});

describe('профили на одном наблюдении', () => {
  const { obs, memory } = base();
  const run = (profile?: (typeof AI_PROFILE_TYPES)[number]) => {
    const ctx = buildContext(
      obs,
      memory,
      createTurnState(),
      profileConfig(profile),
    );
    return { ctx, scores: evaluateStrategies(ctx) };
  };

  it('выбор стратегии зависит от профиля', () => {
    const chosen = (profile: (typeof AI_PROFILE_TYPES)[number]) => {
      const { ctx, scores } = run(profile);
      return chooseStrategy(ctx, scores).chosen.id;
    };

    // Группа из трёх: агрессивному хватает для атаки, оборонительному — нет.
    expect(chosen('aggressive')).toBe('G08');
    expect(chosen('defensive')).toBe('G10');
  });

  it('прибавка не включает неприменимую стратегию и не трогает G01', () => {
    for (const profile of AI_PROFILE_TYPES) {
      const config = profileConfig(profile);
      const plain = evaluateStrategies(
        buildContext(obs, memory, createTurnState(), {
          ...config,
          strategyBias: {},
        }),
      );
      run(profile).scores.forEach((score, index) => {
        if (plain[index].score === 0) expect(score.score).toBe(0);
        if (score.id === 'G01') expect(score.score).toBe(plain[index].score);
      });
    }
  });

  it('профиль не меняет наблюдение и набор предложенных действий', () => {
    const keys = (profile?: (typeof AI_PROFILE_TYPES)[number]) =>
      AI_RULES.flatMap(rule => rule.evaluate(run(profile).ctx))
        .map(actionKey)
        .sort();
    for (const profile of AI_PROFILE_TYPES) {
      expect(run(profile).ctx.obs).toBe(obs);
      expect(keys(profile)).toEqual(keys());
    }
  });
});
