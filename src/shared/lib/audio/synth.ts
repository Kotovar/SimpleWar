import type { SfxTone } from '@shared/config';

let noiseBuffer: AudioBuffer | null = null;

/** Секунда белого шума, общая для всех шумовых тонов. */
const getNoise = (context: AudioContext) => {
  if (!noiseBuffer) {
    const buffer = context.createBuffer(
      1,
      context.sampleRate,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
  }
  return noiseBuffer;
};

/**
 * Синтезирует тон эффекта: огибающая с быстрой атакой и затуханием.
 *
 * @param context - Аудиоконтекст.
 * @param output - Узел громкости эффектов.
 * @param tone - Параметры тона.
 */
export const playTone = (
  context: AudioContext,
  output: GainNode,
  tone: SfxTone,
) => {
  const start = context.currentTime + (tone.delay ?? 0);
  const end = start + tone.duration;
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(tone.gain, start + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  envelope.connect(output);

  let source: AudioScheduledSourceNode;
  if (tone.wave === 'noise') {
    const noise = context.createBufferSource();
    noise.buffer = getNoise(context);
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = tone.from;
    noise.connect(filter).connect(envelope);
    source = noise;
  } else {
    const oscillator = context.createOscillator();
    oscillator.type = tone.wave;
    oscillator.frequency.setValueAtTime(tone.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(tone.to, end);
    oscillator.connect(envelope);
    source = oscillator;
  }
  source.start(start);
  source.stop(end + 0.02);
};
