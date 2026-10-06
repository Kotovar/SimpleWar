import { describe, expect, it } from 'vite-plus/test';
import { getModePrompt } from './modePrompt';

describe('getModePrompt', () => {
  it('стройка: место по требованию здания, без клеток — причина', () => {
    expect(getModePrompt({ kind: 'build', type: 'sawmill', cells: 2 })).toBe(
      'Наведите на клетку в лесу: зелёная — можно строить «Лесопилка». ЛКМ или ПКМ — заложить, рабочий дойдёт сам, цена сразу уйдёт в резерв.',
    );
    expect(getModePrompt({ kind: 'build', type: 'farm', cells: 0 })).toMatch(
      /^Нет известной свободной клетки,/,
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
