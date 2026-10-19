import { describe, expect, it } from 'vite-plus/test';
import { SFX_REPEAT_LIMIT } from '@shared/config';
import { createRepeatLimiter, pickMusicTrack } from './rules';

describe('createRepeatLimiter', () => {
  it('пропускает не больше лимита одинаковых эффектов за окно', () => {
    const allow = createRepeatLimiter({
      ...SFX_REPEAT_LIMIT,
      attack: { max: 2, windowMs: 100 },
    });

    expect([0, 10, 20].map(time => allow('attack', time))).toEqual([
      true,
      true,
      false,
    ]);
    // Другой эффект считается отдельно.
    expect(allow('heal', 20)).toBe(true);
    // Окно прошло — снова можно.
    expect(allow('attack', 110)).toBe(true);
  });

  it('угроза звучит не чаще раза за окно', () => {
    const allow = createRepeatLimiter();
    const { windowMs } = SFX_REPEAT_LIMIT.threat;

    expect(allow('threat', 0)).toBe(true);
    expect(allow('threat', windowMs - 1)).toBe(false);
    expect(allow('threat', windowMs)).toBe(true);
  });
});

describe('pickMusicTrack', () => {
  it('выбирает тему по стадии, видимой угрозе и итогу', () => {
    const base = { combat: false, outcome: null };

    expect(pickMusicTrack({ ...base, phase: 'setup' })).toBe('menu');
    expect(pickMusicTrack({ ...base, phase: 'inProgress' })).toBe('peace');
    expect(pickMusicTrack({ ...base, phase: 'inProgress', combat: true })).toBe(
      'battle',
    );
    expect(
      pickMusicTrack({ phase: 'gameOver', combat: true, outcome: 'victory' }),
    ).toBe('victory');
    expect(pickMusicTrack({ ...base, phase: 'gameOver' })).toBe('defeat');
  });
});
