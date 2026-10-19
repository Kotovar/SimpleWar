import { describe, expect, it } from 'vite-plus/test';
import { create } from 'zustand';
import { isDevtoolsEnabled, withDevtools } from './withDevtools';

describe('isDevtoolsEnabled', () => {
  const extension = { __REDUX_DEVTOOLS_EXTENSION__: {} };

  it.each([
    { isDev: true, host: extension, expected: true },
    { isDev: true, host: {}, expected: false },
    { isDev: false, host: extension, expected: false },
  ])('dev $isDev, extension → $expected', ({ isDev, host, expected }) => {
    expect(isDevtoolsEnabled(isDev, host)).toBe(expected);
  });
});

describe('withDevtools', () => {
  it('keeps the store working with Immer when devtools are off', () => {
    const useCounter = create<{
      count: number;
      add: (step: number) => number;
    }>()(
      withDevtools('counter', (set, get) => ({
        count: 0,
        add: step => {
          set(state => {
            state.count += step;
          });
          return get().count;
        },
      })),
    );

    expect(useCounter.getState().add(2)).toBe(2);
    expect(useCounter.getState().count).toBe(2);
  });
});
