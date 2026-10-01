import {
  SFX_REPEAT_LIMIT,
  type MusicTrack,
  type Phase,
  type Sfx,
} from '@shared/config';

/**
 * Создаёт ограничитель повторов одинаковых эффектов.
 *
 * @param limits - Допустимое число повторов за окно по каждому эффекту.
 * @returns Функция: `true`, если эффект можно проиграть сейчас; разрешённый
 *   запуск запоминается.
 */
export const createRepeatLimiter = (
  limits: Record<Sfx, { max: number; windowMs: number }> = SFX_REPEAT_LIMIT,
) => {
  const played = new Map<Sfx, number[]>();

  return (sfx: Sfx, now: number) => {
    const { max, windowMs } = limits[sfx];
    const recent = (played.get(sfx) ?? []).filter(
      time => now - time < windowMs,
    );
    if (recent.length >= max) {
      played.set(sfx, recent);
      return false;
    }
    recent.push(now);
    played.set(sfx, recent);
    return true;
  };
};

/** Что слышит игрок: стадия партии, видимая угроза и итог. */
export type MusicState = {
  phase: Phase;
  /** Видимый враг рядом со своими объектами. */
  combat: boolean;
  /** Итог для смотрящего; `null`, пока партия идёт. */
  outcome: 'victory' | 'defeat' | null;
};

/**
 * Выбирает музыкальную тему по состоянию партии.
 *
 * @param state - Стадия, видимая угроза и итог.
 * @returns Тема для воспроизведения.
 */
export const pickMusicTrack = ({
  phase,
  combat,
  outcome,
}: MusicState): MusicTrack => {
  if (phase === 'setup') return 'menu';
  if (phase === 'gameOver') return outcome ?? 'defeat';
  return combat ? 'battle' : 'peace';
};
