const AUDIO_URL = `${import.meta.env.BASE_URL}audio/`;

/** Порог тишины в хвосте трека по модулю амплитуды. */
const SILENCE = 0.003;

/**
 * Загружает и декодирует файл из `public/audio`.
 *
 * @param context - Аудиоконтекст для декодирования.
 * @param path - Путь внутри `public/audio`, например `sfx/click.mp3`.
 * @returns Буфер; сбой сети или декодирования — исключение.
 */
export const loadAudio = async (context: BaseAudioContext, path: string) => {
  const response = await fetch(`${AUDIO_URL}${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return context.decodeAudioData(await response.arrayBuffer());
};

/**
 * Конец звучащей части трека, с: тишина после затухания не попадает в
 * цикл, иначе на стыке слышна пауза.
 *
 * @param buffer - Декодированный трек.
 */
export const getLoopEnd = (buffer: AudioBuffer) => {
  let last = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = data.length - 1; i > last; i--) {
      if (Math.abs(data[i]) > SILENCE) {
        last = i;
        break;
      }
    }
  }
  return last > 0 ? (last + 1) / buffer.sampleRate : buffer.duration;
};

/** Ниже этой амплитуды отсчёт считается тишиной и не входит в RMS. */
const AUDIBLE = 0.01;
/** Тихий файл не усиливаем больше, чтобы не поднять шум. */
const MAX_BOOST = 8;

/**
 * Множитель, приводящий звучащую часть файла к целевой громкости. Не даёт
 * пику выйти за 1, иначе усиленный звук захрипит.
 *
 * @param buffer - Декодированный эффект.
 * @param targetDb - Целевая громкость, дБ RMS.
 * @returns Множитель громкости; для пустого файла — 1.
 */
export const getNormalizeGain = (buffer: AudioBuffer, targetDb: number) => {
  let sum = 0;
  let count = 0;
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const sample of buffer.getChannelData(channel)) {
      const level = Math.abs(sample);
      peak = Math.max(peak, level);
      if (level < AUDIBLE) continue;
      sum += sample * sample;
      count++;
    }
  }
  if (!count) return 1;
  const rmsDb = 10 * Math.log10(sum / count);
  const gain = 10 ** ((targetDb - rmsDb) / 20);
  return Math.min(gain, MAX_BOOST, 1 / peak);
};
