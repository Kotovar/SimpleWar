import {
  DEFAULT_AUDIO,
  MUSIC_CROSSFADE,
  SFX_TONES,
  SFX_LOUDNESS_DB,
  SFX_LOUDNESS_OVERRIDE,
  SFX_VARIANTS,
  getSfxFiles,
  type MusicTrack,
  type Sfx,
} from '@shared/config';
import { getLoopEnd, getNormalizeGain, loadAudio } from './loadAudio';
import { playTone } from './synth';
import { createRepeatLimiter, pickMusicTrack, type MusicState } from './rules';

type Volumes = typeof DEFAULT_AUDIO;

type Playing = {
  track: MusicTrack;
  gain: GainNode;
  source?: AudioBufferSourceNode;
};

/**
 * Единственный модуль воспроизведения на Web Audio. Эффекты — файлы из
 * `public/audio/sfx` (случайная вариация), загружаемые при разблокировке;
 * без файла или до загрузки — синтез. Музыка грузится лениво из
 * `public/audio/music/<тема>.mp3`; нет файла — тема молчит.
 *
 * До первого действия пользователя (`unlock`) браузер не даёт звучать:
 * эффекты пропускаются, выбранная тема запускается после разблокировки.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  /** Файлы эффектов с множителем выравнивания громкости. */
  private sfxFiles = new Map<Sfx, { buffer: AudioBuffer; gain: number }[]>();
  private volumes: Volumes = DEFAULT_AUDIO;
  private allow = createRepeatLimiter();
  private buffers = new Map<MusicTrack, Promise<AudioBuffer | null>>();
  /** Выбранная тема: может ещё грузиться. */
  private music: Playing | null = null;
  /** Звучащая тема: уходит, только когда новая готова к старту. */
  private audible: Playing | null = null;
  private state: MusicState = { phase: 'setup', combat: false, outcome: null };

  /** Создаёт контекст по жесту пользователя и запускает текущую тему. */
  unlock() {
    if (typeof AudioContext === 'undefined') return;
    if (!this.context) {
      const context = new AudioContext();
      this.context = context;
      this.sfxGain = context.createGain();
      this.musicGain = context.createGain();
      this.sfxGain.connect(context.destination);
      this.musicGain.connect(context.destination);
      this.applyVolumes();
      this.updateMusic();
      this.preloadSfx(context);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  setVolumes(volumes: Volumes) {
    this.volumes = volumes;
    this.applyVolumes();
  }

  /**
   * Проигрывает эффект, если звук разблокирован, включён и не превышен
   * лимит одинаковых повторов.
   */
  play(sfx: Sfx) {
    const { context, sfxGain } = this;
    if (!context || !sfxGain || this.volumes.muted || !this.volumes.sfxVolume) {
      return;
    }
    // В приостановленном контексте время стоит: эффекты сыграли бы разом
    // после возобновления.
    if (context.state !== 'running') return;
    if (!this.allow(sfx, performance.now())) return;

    const files = this.sfxFiles.get(sfx);
    if (files?.length) {
      const file = files[Math.floor(Math.random() * files.length)];
      const source = context.createBufferSource();
      source.buffer = file.buffer;
      const level = context.createGain();
      level.gain.value = file.gain;
      source.connect(level).connect(sfxGain);
      source.start();
      return;
    }
    SFX_TONES[sfx].forEach(tone => playTone(context, sfxGain, tone));
  }

  /** Предзагружает файлы эффектов; не загрузившийся остаётся синтезом. */
  private preloadSfx(context: AudioContext) {
    for (const sfx of Object.keys(SFX_VARIANTS) as Sfx[]) {
      void Promise.allSettled(
        getSfxFiles(sfx).map(file => loadAudio(context, `sfx/${file}`)),
      ).then(results => {
        const target = SFX_LOUDNESS_OVERRIDE[sfx] ?? SFX_LOUDNESS_DB;
        const buffers = results.flatMap(result =>
          result.status === 'fulfilled'
            ? [
                {
                  buffer: result.value,
                  gain: getNormalizeGain(result.value, target),
                },
              ]
            : [],
        );
        if (buffers.length) this.sfxFiles.set(sfx, buffers);
      });
    }
  }

  /** Обновляет часть состояния партии и при смене темы плавно переключает её. */
  setMusicState(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    this.updateMusic();
  }

  private applyVolumes() {
    const { muted, sfxVolume, musicVolume } = this.volumes;
    if (this.sfxGain) this.sfxGain.gain.value = muted ? 0 : sfxVolume;
    if (this.musicGain) this.musicGain.gain.value = muted ? 0 : musicVolume;
  }

  private updateMusic() {
    const { context, musicGain } = this;
    if (!context || !musicGain) return;
    const track = pickMusicTrack(this.state);
    if (this.music?.track === track) return;

    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(musicGain);
    const playing: Playing = { track, gain };
    this.music = playing;

    void this.load(context, track).then(buffer => {
      // Пока грузили, тема могла смениться.
      if (this.music !== playing) return;
      // Старая тема звучит до готовности новой: без тишины на загрузке.
      this.fadeOut(context);
      if (!buffer) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      // Зацикленный буфер играет стык без паузы и щелчка.
      source.loop = true;
      source.loopEnd = getLoopEnd(buffer);
      source.connect(gain);
      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + MUSIC_CROSSFADE);
      source.start(now);
      playing.source = source;
      this.audible = playing;
    });
  }

  private fadeOut(context: AudioContext) {
    const old = this.audible;
    if (!old) return;
    this.audible = null;
    const now = context.currentTime;
    const { gain } = old.gain;
    // Снимаем недоигранный подъём громкости, иначе он продолжится.
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + MUSIC_CROSSFADE);
    old.source?.stop(now + MUSIC_CROSSFADE);
  }

  private load(context: AudioContext, track: MusicTrack) {
    let buffer = this.buffers.get(track);
    if (!buffer) {
      buffer = loadAudio(context, `music/${track}.mp3`).catch(() => {
        // Сбой не кэшируем: при следующем выборе темы попробуем снова.
        this.buffers.delete(track);
        return null;
      });
      this.buffers.set(track, buffer);
    }
    return buffer;
  }
}

export const audio = new AudioEngine();
