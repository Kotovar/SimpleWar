import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { AudioEngine } from './audioEngine';
import { SFX_VARIANTS, getSfxFiles, type Sfx } from '@shared/config';
import { getLoopEnd, getNormalizeGain } from './loadAudio';

const SFX_FILES = (Object.keys(SFX_VARIANTS) as Sfx[]).flatMap(sfx =>
  getSfxFiles(sfx),
).length;

const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
});

const node = () => ({
  connect: vi.fn(function (this: unknown, next: unknown) {
    return next ?? this;
  }),
  start: vi.fn(),
  stop: vi.fn(),
  gain: param(),
  frequency: param(),
});

/** Двойник AudioContext: считает созданные источники звука. */
class FakeContext {
  static last: FakeContext;
  state: AudioContextState = 'running';
  currentTime = 0;
  sampleRate = 8;
  destination = {};
  sources = 0;
  constructor() {
    FakeContext.last = this;
  }
  createGain = () => node();
  createOscillator = () => (this.sources++, node());
  createBufferSource = () => (this.sources++, node());
  createBiquadFilter = () => node();
  createBuffer = () => ({ getChannelData: () => new Float32Array(8) });
  resume = vi.fn(async () => {});
  decodeAudioData = vi.fn(async () => ({}));
}

afterEach(() => vi.unstubAllGlobals());

const setup = (
  fetch = vi.fn(async (_url: string) => ({ ok: false, statusText: '404' })),
) => {
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('fetch', fetch);
  const engine = new AudioEngine();
  engine.unlock();
  return { engine, context: FakeContext.last, fetch };
};

describe('AudioEngine', () => {
  it('до разблокировки и в приостановленном контексте эффекты не копятся', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    const engine = new AudioEngine();
    engine.play('click');

    const { engine: unlocked, context } = setup();
    context.state = 'suspended';
    unlocked.play('attack');
    expect(context.sources).toBe(0);

    context.state = 'running';
    unlocked.play('attack');
    expect(context.sources).toBeGreaterThan(0);
  });

  it('отключённый звук молчит', () => {
    const { engine, context } = setup();
    engine.setVolumes({ musicVolume: 1, sfxVolume: 1, muted: true });
    engine.play('select');
    expect(context.sources).toBe(0);
  });

  it('несостоявшаяся загрузка темы повторяется при следующем выборе', async () => {
    const { engine, fetch } = setup();
    const menuCalls = () =>
      fetch.mock.calls.filter(([url]) => String(url).includes('music/menu'));
    await vi.waitFor(() => expect(menuCalls()).toHaveLength(1));
    // Даём сбою загрузки обработаться.
    await new Promise(resolve => setTimeout(resolve, 0));

    engine.setMusicState({ phase: 'inProgress' });
    engine.setMusicState({ phase: 'setup' });
    await vi.waitFor(() => expect(menuCalls()).toHaveLength(2));
  });

  it('загруженный файл эффекта играет вместо синтеза', async () => {
    const { engine, context } = setup(
      vi.fn(async (_url: string) => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0),
      })) as never,
    );
    await vi.waitFor(() =>
      // Все файлы эффектов и тема меню.
      expect(context.decodeAudioData).toHaveBeenCalledTimes(SFX_FILES + 1),
    );
    await new Promise(resolve => setTimeout(resolve, 0));

    // Источник музыки уже создан: считаем только прирост.
    const before = context.sources;
    engine.play('attack');
    // Синтез удара — два источника, файл — один.
    expect(context.sources - before).toBe(1);
  });
});

describe('getLoopEnd', () => {
  it('отрезает тишину в хвосте трека', () => {
    const data = new Float32Array(100);
    data[59] = 0.5;
    const buffer = {
      numberOfChannels: 1,
      sampleRate: 10,
      duration: 10,
      getChannelData: () => data,
    } as unknown as AudioBuffer;

    expect(getLoopEnd(buffer)).toBe(6);
  });
});

const bufferOf = (data: Float32Array) =>
  ({
    numberOfChannels: 1,
    getChannelData: () => data,
  }) as unknown as AudioBuffer;

describe('getNormalizeGain', () => {
  it('приводит звучащую часть к цели, не считая тишину', () => {
    // RMS звучащей части 0.1 → −20 дБ; тишина вокруг не влияет.
    const data = new Float32Array(1000);
    data.fill(0.1, 100, 200);
    expect(getNormalizeGain(bufferOf(data), -20)).toBeCloseTo(1);
    expect(getNormalizeGain(bufferOf(data), -26)).toBeCloseTo(0.5, 1);
  });

  it('не выводит пик за 1 и не раздувает тишину', () => {
    const loud = new Float32Array(10).fill(0.5);
    expect(getNormalizeGain(bufferOf(loud), 0)).toBe(2);
    expect(getNormalizeGain(bufferOf(new Float32Array(10)), -20)).toBe(1);
  });
});
