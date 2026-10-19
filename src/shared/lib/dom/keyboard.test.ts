import { describe, expect, it } from 'vite-plus/test';
import { formatKey } from './keyboard';

describe('formatKey', () => {
  it('буква текущей раскладки, без неё — латиница', () => {
    expect(formatKey('KeyB', new Map([['KeyB', 'и']]))).toBe('И');
    expect(formatKey('KeyB')).toBe('B');
  });

  it('цифры и служебные клавиши — короткая подпись', () => {
    expect(formatKey('Digit0')).toBe('0');
    expect(formatKey('Delete')).toBe('Del');
    expect(formatKey('Period', new Map([['Period', 'ю']]))).toBe('.');
  });
});
