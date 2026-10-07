import {
  DAMAGE_TYPE,
  type Building,
  type Position,
  type Sfx,
  type Unit,
} from '@shared/config';
import { isFlyingType } from '@shared/lib';
import type { SceneEvent } from './diffScene';
import type { Effect } from './drawEffects';
import type { ProjectileKind } from './drawProjectile';
import { getEventEffect, getEventSfx } from './sceneFeedback';

/** Появление найма и стройки с пружинкой, мс. */
export const SPAWN_DURATION = 420;
/** Взмах топором к дереву при вырубке, в долях клетки. */
export const CHOP_DEPTH = 0.3;

/** Разгон и торможение на всём пути, а не на каждой клетке. */
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

/** Небольшой перелёт за 1 и возврат: модель «выпрыгивает» на клетку. */
export const easeOutBack = (t: number) =>
  1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2;

/** Доля выпада от 0 до 1 к моменту `progress` (0…1) с `pulses` взмахами. */
export const getLungeReach = (progress: number, pulses: number) =>
  Math.sin(((progress * pulses) % 1) * Math.PI);

/** Шаг по клетке при перемещении, мс. */
export const MOVE_STEP = 120;
/** Выпад ближнего боя, мс; удар — в его пике. */
export const LUNGE_DURATION = 260;
/** Замах дальнего боя до выстрела, мс. */
export const WINDUP_DURATION = 150;
/** Отдача цели от попадания, мс. */
export const HIT_DURATION = 240;
/** Выпад к цели, отдача стрелка и отскок цели — в долях клетки. */
const LUNGE_DEPTH = 0.28;
const RECOIL_DEPTH = 0.1;
const KNOCK_DEPTH = 0.14;
/** Полёт снаряда на клетку дальности, мс; общий полёт в пределах ниже. */
const FLIGHT_PER_CELL = 80;
const FLIGHT_MIN = 160;
const FLIGHT_MAX = 480;
/** Камень катапульты летит по высокой дуге — дольше стрелы. */
const STONE_FLIGHT = 1.6;

/** Длительность хода по пути, мс. */
export const getMoveDuration = (path: readonly Position[]) =>
  MOVE_STEP * Math.max(1, path.length - 1);

/**
 * Точка на пути: равномерно по длине, `t` от 0 до 1.
 *
 * @returns Координаты в клетках, дробные между центрами.
 */
export const getPathPoint = (path: Position[], t: number): Position => {
  const segments = path.length - 1;
  if (segments < 1) return path[0];
  const at = Math.min(segments, Math.max(0, t) * segments);
  const index = Math.min(segments - 1, Math.floor(at));
  const local = at - index;
  const from = path[index];
  const to = path[index + 1];
  return {
    x: from.x + (to.x - from.x) * local,
    y: from.y + (to.y - from.y) * local,
  };
};

/**
 * Когда удар достигает цели после начала атаки: в пике выпада вплотную
 * или после замаха и полёта снаряда издали.
 *
 * @param distance - Расстояние до цели в клетках (Евклид).
 * @param kind - Снаряд; без него — выпад вплотную.
 * @returns Задержка попадания и время полёта снаряда (`0` — без снаряда).
 */
export const getAttackTiming = (distance: number, kind?: ProjectileKind) => {
  if (!kind) return { hit: LUNGE_DURATION / 2, flight: 0 };
  const flight =
    Math.min(FLIGHT_MAX, Math.max(FLIGHT_MIN, distance * FLIGHT_PER_CELL)) *
    (kind === 'stone' ? STONE_FLIGHT : 1);
  return { hit: WINDUP_DURATION + flight, flight };
};

/** Смещение модели к цели и обратно; `pulses` — сколько раз за длительность. */
export type Lunge = {
  dx: number;
  dy: number;
  start: number;
  duration: number;
  pulses: number;
};

export type Projectile = {
  kind: ProjectileKind;
  from: Position;
  to: Position;
  start: number;
  duration: number;
};

/**
 * План показа изменений сцены. Все времена — мс анимации от начала плана:
 * ускорение хода ИИ масштабирует их одинаково, и порядок не рвётся.
 */
export type ScenePlan = {
  moves: Map<string, { path: Position[]; start: number }>;
  lunges: Map<string, Lunge>;
  projectiles: Projectile[];
  effects: Effect[];
  /** Урон, ещё не долетевший до цели: полоса HP меняется при попадании. */
  holds: { id: string; amount: number; until: number }[];
  /** Погибшие, видимые на клетке до попадания по ним. */
  lingers: Map<string, number>;
  /** Новые юниты и здания: «выпрыгивают» на клетку. */
  spawns: Set<string>;
  /** Рычаг катапульты: взвод при наводке, взмах при выстреле. */
  arms: Map<string, ArmMotion>;
  sounds: { sfx: Sfx; at: number }[];
};

/**
 * Движение рычага катапульты: поза `0` — поднят (покой), `1` — взведён.
 * `fire` — выстрел: рычаг взлетает с отскоком, чаша пуста до `reload`.
 */
export type ArmMotion = {
  from: number;
  to: number;
  start: number;
  duration: number;
  fire?: boolean;
  /** Когда камень снова в чаше, мс анимации. */
  reload?: number;
};

/** Исполненный удар осады, видимый смотрящему. */
export type StrikeShot = {
  /** Видимое орудие: его рычаг взлетает, камень вылетает из чаши. */
  siegeId?: string;
  from?: Position;
  /** Клетка удара; нет — она скрыта, видно только взмах орудия. */
  to?: Position;
};

/** Взвод рычага при наводке, мс. */
export const COCK_DURATION = 500;
/** Взмах рычага при выстреле — он же замах перед полётом камня, мс. */
export const SWING_DURATION = WINDUP_DURATION;
/** Через сколько после выстрела камень снова в чаше, мс. */
const RELOAD_DELAY = 700;
/** Чаша поднятого рычага относительно центра клетки: отсюда летит камень. */
const CUP = { x: -0.3, y: -0.33 };

/** Пустой план: основа для эффектов вне событий сцены. */
export const createPlan = (patch: Partial<ScenePlan> = {}): ScenePlan => ({
  moves: new Map(),
  lunges: new Map(),
  projectiles: [],
  effects: [],
  holds: [],
  lingers: new Map(),
  spawns: new Set(),
  arms: new Map(),
  sounds: [],
  ...patch,
});

type PlanContext = {
  /** Без движения: всё сразу, без выпадов и снарядов. */
  instant: boolean;
  /** Объект сцены сейчас (после изменения). */
  entity: (id: string) => Unit | Building | undefined;
  /** Клетки, по которым юнит прошёл; нет — шаг по прямой. */
  trail?: (id: string) => Position[] | undefined;
  /** Через сколько мс анимации объект освободится (ещё идёт прошлый ход). */
  busy?: (id: string) => number;
  /**
   * Исполненные удары осады: клетка и видимое орудие; орудие не видно —
   * камень падает сверху, не выдавая, откуда.
   */
  strikes?: readonly StrikeShot[];
};

/** Камень невидимого орудия падает с высоты над клеткой, в клетках. */
const SKY_DROP = 3;

/**
 * Раскладывает изменения сцены во времени: ход по пройденным клеткам,
 * затем выпад вплотную или замах и полёт снаряда издали (камень — у удара
 * осады), затем попадание — вспышка, число урона, отскок цели и только
 * тогда новое HP. Погибший стоит на клетке до попадания. Несколько ударов
 * по клетке — попадание по последнему. Команды уже применены: это показ.
 *
 * @param events - Изменения сцены из {@link diffScene}.
 * @returns Что и когда показывать и озвучивать.
 */
export const planSceneAnimations = (
  events: readonly SceneEvent[],
  { instant, entity, trail, busy, strikes = [] }: PlanContext,
): ScenePlan => {
  const plan = createPlan();
  const key = ({ x, y }: Position) => `${x},${y}`;
  const hits = new Map<string, { at: number; from: Position }>();
  const ready = new Map<string, number>();
  const readyAt = (id: string) =>
    instant ? 0 : (ready.get(id) ?? busy?.(id) ?? 0);

  for (const event of events) {
    if (event.kind !== 'move') continue;
    plan.sounds.push({ sfx: getEventSfx(event), at: 0 });
    const moved = entity(event.id);
    if (!moved || instant) continue;
    const from = { x: event.fromX, y: event.fromY };
    const to = { x: moved.x, y: moved.y };
    const flying = 'maxMovePoints' in moved && isFlyingType(moved.type);
    const walked = trail?.(event.id);
    const path = !flying && walked && walked.length > 1 ? walked : [from, to];
    const start = readyAt(event.id);
    plan.moves.set(event.id, { path, start });
    ready.set(event.id, start + getMoveDuration(path));
  }

  /** `id` — кто стреляет; `null` — удар осады: орудие не дёргается. */
  const shoot = (
    id: string | null,
    from: Position,
    to: Position,
    kind: ProjectileKind | undefined,
  ) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy) || 1;
    const start = id ? readyAt(id) : 0;
    const timing = getAttackTiming(distance, kind);
    const at = instant ? 0 : start + timing.hit;
    const known = hits.get(key(to));
    if (!known || known.at < at) hits.set(key(to), { at, from });
    if (instant) return;
    const [ux, uy] = [dx / distance, dy / distance];
    const depth = kind ? -RECOIL_DEPTH : LUNGE_DEPTH;
    if (id) {
      plan.lunges.set(id, {
        dx: ux * depth,
        dy: uy * depth,
        start,
        duration: kind ? WINDUP_DURATION : LUNGE_DURATION,
        pulses: 1,
      });
    }
    if (!kind) return;
    plan.projectiles.push({
      kind,
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      start: start + WINDUP_DURATION,
      duration: timing.flight,
    });
  };

  for (const event of events) {
    if (event.kind === 'attack') {
      plan.sounds.push({ sfx: getEventSfx(event), at: readyAt(event.id) });
      const attacker = entity(event.id);
      if (!attacker || !event.target) continue;
      // Ближний бой — по дальности атакующего, а не по расстоянию до цели.
      const melee = 'attackRange' in attacker && attacker.attackRange <= 1;
      const kind: ProjectileKind | undefined = melee
        ? undefined
        : DAMAGE_TYPE[attacker.type] === 'magic'
          ? 'magic'
          : 'arrow';
      shoot(event.id, attacker, event.target, kind);
    }
  }
  // Удар осады: камень летит всегда, даже по пустой клетке.
  const struck = new Set(
    events.flatMap(event =>
      event.kind === 'damage' || event.kind === 'death' ? [key(event)] : [],
    ),
  );
  for (const { siegeId, from, to } of strikes) {
    // Видимое орудие выстреливает: рычаг взлетает, камень уходит из чаши.
    if (siegeId && !instant) {
      plan.arms.set(siegeId, {
        from: 1,
        to: 0,
        start: 0,
        duration: SWING_DURATION,
        fire: true,
        reload: SWING_DURATION + RELOAD_DELAY,
      });
    }
    if (!to) continue;
    const launch = from
      ? { x: from.x + CUP.x, y: from.y + CUP.y }
      : { x: to.x, y: to.y - SKY_DROP };
    shoot(null, launch, to, 'stone');
    const at = hits.get(key(to))?.at ?? 0;
    plan.effects.push({ x: to.x, y: to.y, impact: true, start: at });
    // Попадание по объекту озвучивает его урон; пустая клетка — сам удар.
    if (!struck.has(key(to))) plan.sounds.push({ sfx: 'strike', at });
  }

  for (const event of events) {
    if (event.kind === 'attack' || event.kind === 'move') continue;
    if (event.kind === 'spawn' && !instant) plan.spawns.add(event.id);
    if (event.kind === 'prepare') {
      // Орудие взводят — рычаг опускается назад, — кольцо сходится на
      // отметке. Идущее орудие сначала дойдёт.
      const start = readyAt(event.id);
      if (!instant) {
        plan.arms.set(event.id, {
          from: 0,
          to: 1,
          start,
          duration: COCK_DURATION,
        });
        plan.effects.push({
          ...event.target,
          aim: true,
          start,
          duration: COCK_DURATION,
        });
      }
      plan.sounds.push({ sfx: getEventSfx(event), at: start });
      continue;
    }
    if (event.kind !== 'damage' && event.kind !== 'death') {
      const effect = getEventEffect(event, 0);
      if (effect) plan.effects.push(effect);
      plan.sounds.push({ sfx: getEventSfx(event), at: 0 });
      continue;
    }
    const landed = hits.get(key(event));
    const at = landed?.at ?? 0;
    const effect = getEventEffect(event, at);
    if (effect) plan.effects.push(effect);
    plan.sounds.push({ sfx: getEventSfx(event), at });
    if (event.kind === 'death') {
      if (at > 0) plan.lingers.set(event.id, at);
      continue;
    }
    if (at > 0)
      plan.holds.push({ id: event.id, amount: event.amount, until: at });
    if (instant) continue;
    // Отскок от удара; без видимого атакующего — дрожь на месте.
    const from = landed?.from ?? event;
    const length = Math.hypot(event.x - from.x, event.y - from.y);
    plan.lunges.set(event.id, {
      dx: length
        ? ((event.x - from.x) / length) * KNOCK_DEPTH
        : KNOCK_DEPTH / 2,
      dy: length ? ((event.y - from.y) / length) * KNOCK_DEPTH : 0,
      start: at,
      duration: HIT_DURATION,
      pulses: length ? 1 : 2,
    });
  }
  return plan;
};
