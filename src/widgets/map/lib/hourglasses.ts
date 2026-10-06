import type { HourglassState } from './drawHourglass';

/** Пересыпание песка, когда своя сущность потратила ход, мс. */
export const POUR_DURATION = 1200;
/** Переворот часов в начале нового хода, мс. */
export const FLIP_DURATION = 700;

/**
 * Часы сущности: пересыпание, скрыты до конца хода (цель появилась, но
 * очки не вернулись) или переворот в начале нового хода.
 */
export type Hourglass = { kind: 'pour' | 'hidden' | 'flip'; start: number };

/**
 * Переводит часы к новому набору отходивших. Переворот — только когда
 * сущность вернула очки (новый ход); если она перестала считаться
 * отходившей в том же ходу, часы прячутся без анимации и при возврате
 * показываются уже пересыпанными.
 *
 * @param glasses - Прежние часы; не изменяются.
 * @param spent - Отходившие сейчас, см. `getSpentIds`.
 * @param isRestored - Вернула ли сущность очки; `null` — сущности больше нет.
 * @param now - Время кадра, мс.
 * @param instant - Первый показ: новые часы сразу пересыпаны.
 * @returns Новые часы.
 */
export const updateHourglasses = (
  glasses: ReadonlyMap<string, Hourglass>,
  spent: ReadonlySet<string>,
  isRestored: (id: string) => boolean | null,
  now: number,
  instant: boolean,
) => {
  const next = new Map<string, Hourglass>();
  spent.forEach(id => {
    const glass = glasses.get(id);
    if (glass?.kind === 'pour') next.set(id, glass);
    else if (glass?.kind === 'hidden') next.set(id, { ...glass, kind: 'pour' });
    else next.set(id, { kind: 'pour', start: instant ? -Infinity : now });
  });
  glasses.forEach((glass, id) => {
    if (spent.has(id)) return;
    const restored = isRestored(id);
    if (restored === null) return;
    if (glass.kind === 'flip') {
      if (now - glass.start < FLIP_DURATION) next.set(id, glass);
    } else if (!restored) next.set(id, { ...glass, kind: 'hidden' });
    else if (glass.kind === 'pour') next.set(id, { kind: 'flip', start: now });
  });
  return next;
};

/**
 * Кадр часов к моменту `time`; `null` — не рисовать.
 *
 * @param still - Без движения: пересыпание и переворот уже завершены.
 */
export const getHourglassFrame = (
  glass: Hourglass,
  time: number,
  still: boolean,
): HourglassState | null => {
  if (glass.kind === 'hidden') return null;
  const duration = glass.kind === 'pour' ? POUR_DURATION : FLIP_DURATION;
  const progress = still ? 1 : (time - glass.start) / duration;
  if (glass.kind === 'flip') {
    return progress >= 1 ? null : { sand: 1, flip: progress };
  }
  return { sand: Math.min(1, progress), flip: 0 };
};

/**
 * Кадры всех часов и нужен ли следующий кадр. Переворот анимируется с
 * самого начала: его первый кадр совпадает по времени с назначением.
 *
 * @param still - Без движения: см. {@link getHourglassFrame}.
 */
export const getHourglassFrames = (
  glasses: ReadonlyMap<string, Hourglass>,
  time: number,
  still: boolean,
) => {
  const frames = new Map<string, HourglassState>();
  let animating = false;
  glasses.forEach((glass, id) => {
    const frame = getHourglassFrame(glass, time, still);
    if (!frame) return;
    frames.set(id, frame);
    if (glass.kind === 'flip' || frame.sand < 1) animating = true;
  });
  return { frames, animating };
};
