import { describe, expect, it } from 'vite-plus/test';
import { ACTIONS, GLOBAL_HOTKEYS, SLOT_CODES } from '@shared/config';
import { getHelpGroups } from './helpGroups';

describe('getHelpGroups', () => {
  it('включает каждое действие и общую клавишу справочника ровно один раз', () => {
    const items = getHelpGroups().flatMap(group => group.items);
    for (const action of [...Object.values(ACTIONS), ...GLOBAL_HOTKEYS]) {
      const matches = items.filter(item => item.codes.includes(action.code));
      expect(matches).toHaveLength(1);
      expect(matches[0].label).toBe(action.label);
    }
    for (const code of SLOT_CODES) {
      expect(items.filter(item => item.codes.includes(code))).toHaveLength(1);
    }
  });

  it('подписывает буквы текущей раскладки, сохраняя служебные клавиши и цифры', () => {
    const items = getHelpGroups(
      new Map([
        ['KeyB', 'и'],
        ['KeyW', 'ц'],
      ]),
    ).flatMap(group => group.items);
    expect(items.find(item => item.codes.includes('KeyB'))?.keys).toBe('И');
    expect(items.find(item => item.codes.includes('KeyW'))?.keys).toBe('Ц');
    expect(items.find(item => item.codes.includes('Escape'))?.keys).toBe('Esc');
    expect(items.find(item => item.codes.includes('Digit0'))?.keys).toBe('1…0');
    expect(
      getHelpGroups()
        .flatMap(group => group.items)
        .find(item => item.codes.includes('KeyB'))?.keys,
    ).toBe('B');
  });
});
