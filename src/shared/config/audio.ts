import type { BuildingType } from './buildings';
import type { UnitType } from './units';

/** Звуковой эффект: игровое событие или отклик интерфейса. */
export type Sfx =
  | 'select'
  | 'move'
  | 'attack'
  /** Выстрел из лука: лучник и башня. */
  | 'shot'
  | 'griffonAttack'
  | 'griffonDeath'
  | 'magic'
  | 'hitUnit'
  | 'hitBuilding'
  | 'heal'
  | 'strikePrepare'
  | 'strike'
  | 'build'
  | 'spawn'
  /** Разрушение здания. */
  | 'destroy'
  /** Гибель юнита. */
  | 'death'
  | 'turnStart'
  | 'reject'
  | 'threat'
  | 'click';

/** Музыкальная тема по состоянию партии. */
export type MusicTrack = 'menu' | 'peace' | 'battle' | 'victory' | 'defeat';

/**
 * Тон синтезированного эффекта. `noise` — белый шум через полосовой фильтр
 * с частотой `from`; иначе осциллятор, скользящий от `from` к `to` Гц.
 */
export type SfxTone = {
  wave: OscillatorType | 'noise';
  from: number;
  to: number;
  /** Длительность, с. */
  duration: number;
  /** Пиковая громкость тона от 0 до 1. */
  gain: number;
  /** Задержка от начала эффекта, с. */
  delay?: number;
};

/**
 * Эффекты синтезируются Web Audio без файлов: бюджет размера 0 байт,
 * лицензия — код проекта. Короткие, чтобы не мешать при частых событиях.
 */
export const SFX_TONES: Record<Sfx, SfxTone[]> = {
  select: [
    { wave: 'triangle', from: 660, to: 880, duration: 0.06, gain: 0.25 },
  ],
  click: [{ wave: 'triangle', from: 520, to: 520, duration: 0.03, gain: 0.15 }],
  move: [{ wave: 'noise', from: 900, to: 900, duration: 0.12, gain: 0.18 }],
  attack: [
    { wave: 'noise', from: 2400, to: 2400, duration: 0.09, gain: 0.35 },
    { wave: 'sawtooth', from: 320, to: 120, duration: 0.1, gain: 0.12 },
  ],
  magic: [
    { wave: 'sine', from: 500, to: 1400, duration: 0.25, gain: 0.25 },
    {
      wave: 'triangle',
      from: 1000,
      to: 2200,
      duration: 0.2,
      gain: 0.12,
      delay: 0.05,
    },
  ],
  hitUnit: [{ wave: 'square', from: 220, to: 90, duration: 0.1, gain: 0.18 }],
  hitBuilding: [
    { wave: 'noise', from: 300, to: 300, duration: 0.16, gain: 0.35 },
    { wave: 'sine', from: 140, to: 70, duration: 0.15, gain: 0.25 },
  ],
  heal: [
    { wave: 'sine', from: 660, to: 660, duration: 0.12, gain: 0.2 },
    {
      wave: 'sine',
      from: 990,
      to: 990,
      duration: 0.18,
      gain: 0.18,
      delay: 0.09,
    },
  ],
  strikePrepare: [
    { wave: 'sawtooth', from: 90, to: 160, duration: 0.3, gain: 0.12 },
    {
      wave: 'noise',
      from: 1200,
      to: 1200,
      duration: 0.05,
      gain: 0.25,
      delay: 0.28,
    },
  ],
  strike: [
    { wave: 'noise', from: 180, to: 180, duration: 0.45, gain: 0.5 },
    { wave: 'sine', from: 110, to: 40, duration: 0.4, gain: 0.4 },
  ],
  build: [
    { wave: 'noise', from: 1800, to: 1800, duration: 0.04, gain: 0.3 },
    {
      wave: 'noise',
      from: 1800,
      to: 1800,
      duration: 0.04,
      gain: 0.3,
      delay: 0.14,
    },
    {
      wave: 'triangle',
      from: 520,
      to: 780,
      duration: 0.18,
      gain: 0.15,
      delay: 0.26,
    },
  ],
  spawn: [
    { wave: 'triangle', from: 440, to: 440, duration: 0.08, gain: 0.18 },
    {
      wave: 'triangle',
      from: 660,
      to: 660,
      duration: 0.12,
      gain: 0.18,
      delay: 0.08,
    },
  ],
  shot: [
    { wave: 'triangle', from: 900, to: 300, duration: 0.08, gain: 0.2 },
    {
      wave: 'noise',
      from: 3000,
      to: 3000,
      duration: 0.12,
      gain: 0.2,
      delay: 0.03,
    },
  ],
  griffonAttack: [
    { wave: 'sawtooth', from: 1400, to: 700, duration: 0.22, gain: 0.14 },
    {
      wave: 'noise',
      from: 1500,
      to: 1500,
      duration: 0.15,
      gain: 0.25,
      delay: 0.1,
    },
  ],
  griffonDeath: [
    { wave: 'sawtooth', from: 1200, to: 300, duration: 0.45, gain: 0.14 },
    {
      wave: 'noise',
      from: 500,
      to: 500,
      duration: 0.2,
      gain: 0.25,
      delay: 0.3,
    },
  ],
  death: [
    { wave: 'sawtooth', from: 260, to: 70, duration: 0.35, gain: 0.16 },
    { wave: 'noise', from: 600, to: 600, duration: 0.2, gain: 0.25 },
  ],
  destroy: [
    { wave: 'noise', from: 250, to: 250, duration: 0.5, gain: 0.45 },
    { wave: 'sawtooth', from: 160, to: 40, duration: 0.45, gain: 0.15 },
  ],
  turnStart: [
    { wave: 'triangle', from: 523, to: 523, duration: 0.12, gain: 0.22 },
    {
      wave: 'triangle',
      from: 659,
      to: 659,
      duration: 0.12,
      gain: 0.22,
      delay: 0.12,
    },
    {
      wave: 'triangle',
      from: 784,
      to: 784,
      duration: 0.22,
      gain: 0.22,
      delay: 0.24,
    },
  ],
  reject: [
    { wave: 'square', from: 200, to: 200, duration: 0.08, gain: 0.14 },
    {
      wave: 'square',
      from: 150,
      to: 150,
      duration: 0.12,
      gain: 0.14,
      delay: 0.1,
    },
  ],
  threat: [
    { wave: 'sawtooth', from: 440, to: 330, duration: 0.18, gain: 0.16 },
    {
      wave: 'sawtooth',
      from: 440,
      to: 330,
      duration: 0.18,
      gain: 0.16,
      delay: 0.22,
    },
  ],
};

/**
 * Вариации файлов эффектов в `public/audio/sfx`: одна — `<имя>.mp3`,
 * несколько — `<имя>1.mp3` … `<имя>N.mp3`, играет случайная. Эффект без
 * файла или до загрузки звучит синтезом из `SFX_TONES`.
 */
export const SFX_VARIANTS: Partial<Record<Sfx, number>> = {
  select: 2,
  click: 1,
  move: 3,
  attack: 3,
  magic: 2,
  hitUnit: 2,
  hitBuilding: 2,
  heal: 2,
  strikePrepare: 1,
  strike: 2,
  build: 3,
  spawn: 1,
  destroy: 3,
  turnStart: 1,
  reject: 1,
  threat: 1,
  shot: 3,
  griffonAttack: 3,
  griffonDeath: 2,
  death: 3,
};

/**
 * Целевая громкость звучащей части файла эффекта, дБ RMS. Файлы из разных
 * генераций различаются на десятки дБ: движок выравнивает их при загрузке,
 * не трогая сами файлы. Частые и интерфейсные звуки тише событий боя.
 */
export const SFX_LOUDNESS_DB = -20;

export const SFX_LOUDNESS_OVERRIDE: Partial<Record<Sfx, number>> = {
  click: -30,
  select: -28,
  move: -27,
  reject: -26,
  heal: -24,
  turnStart: -22,
  destroy: -18,
  strike: -18,
};

/**
 * Имена файлов эффекта по числу вариаций.
 *
 * @param sfx - Эффект.
 * @param count - Число вариаций.
 */
export const getSfxFiles = (sfx: Sfx, count = SFX_VARIANTS[sfx] ?? 0) =>
  count === 1
    ? [`${sfx}.mp3`]
    : Array.from({ length: count }, (_, i) => `${sfx}${i + 1}.mp3`);

/** Звук удара по типу атакующего; остальные — по типу урона. */
export const ATTACK_SFX: Partial<Record<UnitType | BuildingType, Sfx>> = {
  archer: 'shot',
  tower: 'shot',
  griffon: 'griffonAttack',
};

/** Звук гибели по типу юнита; остальные — `death`. */
export const DEATH_SFX: Partial<Record<UnitType | BuildingType, Sfx>> = {
  griffon: 'griffonDeath',
};

/**
 * Ограничение повторов: не больше `max` одинаковых эффектов за `windowMs`.
 * Угроза и начало хода звучат редко, чтобы не превращаться в шум.
 */
export const SFX_REPEAT_LIMIT: Record<Sfx, { max: number; windowMs: number }> =
  {
    ...(Object.fromEntries(
      Object.keys(SFX_TONES).map(sfx => [sfx, { max: 3, windowMs: 150 }]),
    ) as Record<Sfx, { max: number; windowMs: number }>),
    move: { max: 2, windowMs: 150 },
    threat: { max: 1, windowMs: 4000 },
    turnStart: { max: 1, windowMs: 1000 },
    reject: { max: 1, windowMs: 300 },
  };

/** Плавная смена музыкальной темы, с. */
export const MUSIC_CROSSFADE = 2;

/**
 * Сторона-угроза ближе этого числа клеток к своим объектам включает музыку
 * боя. Считается только по видимым врагам: музыка не выдаёт скрытых.
 */
export const COMBAT_MUSIC_DISTANCE = 6;

/** Громкость по умолчанию: тихо, игрок прибавит сам. */
export const DEFAULT_AUDIO = {
  musicVolume: 0.25,
  sfxVolume: 0.25,
  muted: false,
};
