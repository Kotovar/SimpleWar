import { afterEach, describe, expect, it } from 'vite-plus/test';
import { getAiPlayback, usePreferencesStore } from './preferencesStore';

afterEach(() =>
  usePreferencesStore.setState({ aiPlayback: 'normal', aiRush: false }),
);

describe('ускорение очереди врагов (M5)', () => {
  it('на время очереди — без анимаций, настройка скорости не меняется', () => {
    const store = usePreferencesStore.getState();
    store.setAiPlayback('fast');
    store.setAiRush(true);

    expect(getAiPlayback(usePreferencesStore.getState())).toBe('instant');
    expect(usePreferencesStore.getState().aiPlayback).toBe('fast');
    usePreferencesStore.getState().setAiRush(false);
    expect(getAiPlayback(usePreferencesStore.getState())).toBe('fast');
  });
});
