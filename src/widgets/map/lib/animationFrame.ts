import type { Building, Position, Sfx, Unit } from '@shared/config';
import { EFFECT_DURATION, type Effect } from './drawEffects';
import type { CellOffsets } from './renderEntitiesLayer';
import {
  easeInOut,
  easeOutBack,
  getLungeReach,
  getMoveDuration,
  getPathPoint,
  SPAWN_DURATION,
  type ArmMotion,
  type Projectile,
  type ScenePlan,
} from './unitAnimations';

/** Доля взмаха, когда рычаг упирается вверх и камень уходит из чаши. */
const RELEASE = 0.75;

/**
 * Поза рычага катапульты к моменту `t`; `null` — движение не идёт.
 * Взвод — плавно; выстрел — с ускорением до упора, отскок, чаша пуста до
 * перезарядки. До начала движения рычаг держит исходную позу.
 */
export const getArmPose = (
  { from, to, start, duration, fire, reload = 0 }: ArmMotion,
  t: number,
): { arm: number; loaded: boolean } | null => {
  const progress = (t - start) / duration;
  if (progress < 0) return { arm: from, loaded: true };
  if (!fire)
    return progress < 1
      ? { arm: from + (to - from) * easeInOut(progress), loaded: true }
      : null;
  if (progress < RELEASE) {
    const swing = (progress / RELEASE) ** 2;
    return { arm: from + (to - from) * swing, loaded: true };
  }
  if (progress < 1) {
    // Отскок от упора: рычаг чуть проходит позу покоя и возвращается.
    const bounce = Math.sin(((progress - RELEASE) / (1 - RELEASE)) * Math.PI);
    return { arm: to - bounce * 0.12, loaded: false };
  }
  return t < reload ? { arm: to, loaded: false } : null;
};

/**
 * Проигрываемый план: с какого момента он идёт и погибшие, видимые до
 * попадания (их объекты из прошлого кадра). Звуки — только отложенные:
 * мгновенные проигрываются при постановке плана.
 */
export type AnimationTrack = {
  plan: ScenePlan;
  /** Момент начала, мс `performance.now()`. */
  t0: number;
  ai: boolean;
  bodies?: ReadonlyMap<string, Unit | Building>;
  /**
   * Сколько мс анимации уже показано: копится по кадрам с текущей
   * скоростью, поэтому смена скорости не перематывает показанное.
   */
  clock?: number;
  /** Когда часы продвигались в последний раз, мс `performance.now()`. */
  last?: number;
};

/**
 * Продвигает часы треков до `time` с их текущей скоростью.
 *
 * @param rate - Множитель скорости трека (ускорение хода ИИ).
 */
export const advanceTracks = (
  tracks: readonly AnimationTrack[],
  time: number,
  rate: (track: AnimationTrack) => number,
) =>
  tracks.forEach(track => {
    track.clock =
      (track.clock ?? 0) +
      Math.max(0, time - (track.last ?? track.t0)) * rate(track);
    track.last = time;
  });

export type AnimationFrame = {
  offsets: CellOffsets;
  /** Погибшие, ещё стоящие на клетке до попадания. */
  bodies: (Unit | Building)[];
  /** `still` — план показывается без движения: эффект стоит на месте. */
  effects: { effect: Effect; progress: number; still: boolean }[];
  projectiles: { shot: Projectile; progress: number }[];
  /** Звуки, чьё время пришло в этом кадре. */
  sounds: Sfx[];
  /** Треки, которым ещё есть что показать. */
  tracks: AnimationTrack[];
};

/**
 * Собирает кадр всех проигрываемых планов: смещения хода (важнее выпадов),
 * выпадов и отскоков, пружинку появления, прежнее HP до попадания, эффекты
 * и снаряды. Отыгравшие звуки убираются из плана.
 *
 * @param tracks - Проигрываемые планы.
 * @param local - Мс анимации с начала трека.
 * @param entity - Объект сцены сейчас: от него отсчитываются смещения и HP.
 * @param skip - Без показа: ход, выпады, снаряды, прежнее HP и погибшие
 *   завершаются сразу, отложенные звуки снимаются; эффекты остаются
 *   (вызывающий рисует их неподвижными).
 */
export const getAnimationFrame = (
  tracks: readonly AnimationTrack[],
  local: (track: AnimationTrack) => number,
  entity: (id: string) => (Position & { hp: number }) | undefined,
  skip: (track: AnimationTrack) => boolean = () => false,
): AnimationFrame => {
  const frame: AnimationFrame = {
    offsets: new Map(),
    bodies: [],
    effects: [],
    projectiles: [],
    sounds: [],
    tracks: [],
  };
  const pending = new Map<string, number>();
  const timed = tracks.map(track => {
    const t = local(track);
    const still = skip(track);
    // Без показа движение завершено, эффекты идут своим временем.
    return { track, t: still ? Infinity : t, effectsT: t, still };
  });
  const set = (id: string, patch: Partial<{ dx: number; dy: number }>) =>
    frame.offsets.set(id, { dx: 0, dy: 0, ...frame.offsets.get(id), ...patch });

  for (const { track, t, effectsT, still } of timed) {
    let alive = false;
    const { plan } = track;
    plan.moves.forEach(({ path, start }, id) => {
      const progress = (t - start) / getMoveDuration(path);
      const now = entity(id);
      if (!now || progress >= 1) return;
      alive = true;
      // До своего хода юнит ждёт в начале пути, если не идёт прошлый ход.
      if (progress < 0 && frame.offsets.has(id)) return;
      const point = getPathPoint(path, easeInOut(Math.max(0, progress)));
      set(id, { dx: point.x - now.x, dy: point.y - now.y });
    });
    if (skip(track)) plan.sounds = [];
    plan.sounds = plan.sounds.filter(({ sfx, at }) => {
      if (t < at) return (alive = true);
      frame.sounds.push(sfx);
      return false;
    });
    plan.holds.forEach(({ id, amount, until }) => {
      if (t >= until) return;
      alive = true;
      pending.set(id, (pending.get(id) ?? 0) + amount);
    });
    plan.lingers.forEach((until, id) => {
      const body = track.bodies?.get(id);
      if (t >= until || !body) return;
      alive = true;
      frame.bodies.push(body);
    });
    plan.effects.forEach(effect => {
      const progress =
        (effectsT - effect.start) / (effect.duration ?? EFFECT_DURATION);
      if (progress >= 1) return;
      alive = true;
      frame.effects.push({ effect, progress, still });
    });
    plan.projectiles.forEach(shot => {
      const progress = (t - shot.start) / shot.duration;
      if (progress >= 1) return;
      alive = true;
      if (progress >= 0) frame.projectiles.push({ shot, progress });
    });
    plan.lunges.forEach(({ duration, start }) => {
      if ((t - start) / duration < 1) alive = true;
    });
    plan.spawns.forEach(() => {
      if (t < SPAWN_DURATION) alive = true;
    });
    plan.arms.forEach(motion => {
      if (t < motion.start + motion.duration || t < (motion.reload ?? 0))
        alive = true;
    });
    if (alive) frame.tracks.push(track);
  }

  // Выпады — после хода всех треков: идущий юнит не дёргается.
  const moving = new Set(frame.offsets.keys());
  for (const { track, t } of timed) {
    track.plan.lunges.forEach(({ dx, dy, start, duration, pulses }, id) => {
      const progress = (t - start) / duration;
      if (progress < 0 || progress >= 1 || moving.has(id)) return;
      const reach = getLungeReach(progress, pulses);
      set(id, { dx: dx * reach, dy: dy * reach });
    });
    track.plan.spawns.forEach(id => {
      const progress = t / SPAWN_DURATION;
      if (progress >= 1) return;
      frame.offsets.set(id, {
        dx: 0,
        dy: 0,
        ...frame.offsets.get(id),
        scale: 0.3 + easeOutBack(Math.max(0, progress)) * 0.7,
      });
    });
  }
  // Погибший до попадания: его ещё не долетевший урон тоже не показан.
  frame.bodies = frame.bodies.map(body =>
    pending.has(body.id)
      ? { ...body, hp: body.hp + (pending.get(body.id) ?? 0) }
      : body,
  );
  for (const { track, t } of timed) {
    track.plan.arms.forEach((motion, id) => {
      const pose = getArmPose(motion, t);
      if (pose)
        frame.offsets.set(id, {
          dx: 0,
          dy: 0,
          ...frame.offsets.get(id),
          ...pose,
        });
    });
  }
  pending.forEach((amount, id) => {
    const now = entity(id);
    if (!now) return;
    frame.offsets.set(id, {
      dx: 0,
      dy: 0,
      ...frame.offsets.get(id),
      hp: now.hp + amount,
    });
  });
  return frame;
};

/**
 * Через сколько мс реального времени объект закончит уже идущий ход:
 * следующая его атака или ход начнутся после. Остаток каждого плана
 * переводится из его мс анимации по его скорости.
 *
 * @param rate - Множитель скорости плана (ускорение хода ИИ).
 */
export const getBusyTime = (
  tracks: readonly AnimationTrack[],
  local: (track: AnimationTrack) => number,
  id: string,
  rate: (track: AnimationTrack) => number = () => 1,
) =>
  Math.max(
    0,
    ...tracks.map(track => {
      const move = track.plan.moves.get(id);
      return move
        ? (move.start + getMoveDuration(move.path) - local(track)) / rate(track)
        : 0;
    }),
  );
