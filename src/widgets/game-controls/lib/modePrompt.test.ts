import { describe, expect, it } from 'vite-plus/test';
import { getModePrompt } from './modePrompt';

describe('getModePrompt', () => {
  it('стройка: место по требованию здания, без клеток — причина', () => {
    expect(getModePrompt({ kind: 'build', type: 'sawmill', cells: 2 })).toBe(
      'Кликните по подсвеченной клетке в лесу, чтобы построить «Лесопилка».',
    );
    expect(getModePrompt({ kind: 'build', type: 'farm', cells: 0 })).toMatch(
      /^Рядом с рабочим нет свободной клетки,/,
    );
  });

  it('найм, расчистка и прицел объясняют пустую подсветку', () => {
    expect(getModePrompt({ kind: 'spawn', type: 'archer', cells: 0 })).toMatch(
      /нет свободной клетки/,
    );
    expect(getModePrompt({ kind: 'clear', cells: 0 })).toMatch(/нет/);
    expect(getModePrompt({ kind: 'strike', cells: 3 })).toMatch(/2–5/);
  });
});
