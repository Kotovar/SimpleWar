import type { MilitaryUnit, Position } from '@shared/config';
import type { AiOperation } from '@entities/ai-memories';
import type { AiContext } from './context';
import { baseAlarm, enemyPower, enemyTarget, nearest } from './facts';
import { manhattan, tieBreak } from './geometry';
import { powerOf } from './stats';

/** Юниты, занятые задачей (разведка): в группы они не входят. */
const taskedUnits = (ctx: AiContext) =>
  new Set(ctx.memory.tasks.map(({ unitId }) => unitId));

/** Ударная группа: военные вне гарнизона и вне задач. */
export const strikeGroup = (ctx: AiContext): MilitaryUnit[] => {
  const busy = taskedUnits(ctx);
  const garrison = new Set(ctx.memory.garrison);
  return ctx.military.filter(({ id }) => !busy.has(id) && !garrison.has(id));
};

/** Гарнизон: военные, оставленные у ратуши. */
export const garrisonUnits = (ctx: AiContext): MilitaryUnit[] => {
  const ids = new Set(ctx.memory.garrison);
  return ctx.military.filter(({ id }) => ids.has(id));
};

/**
 * Цель наступления: известное вражеское здание; без него — самая далёкая
 * от своей базы граница разведки. Положение базы из генератора не берётся.
 */
export const pickTarget = (ctx: AiContext): Position | null => {
  const known = enemyTarget(ctx);
  if (known) return { x: known.x, y: known.y };
  const from = ctx.base ?? ctx.obs.ownUnits[0];
  if (!from || !ctx.frontier.length) return null;
  return [...ctx.frontier].sort(
    (a, b) =>
      manhattan(b, from) - manhattan(a, from) ||
      tieBreak(`${a.x},${a.y}`, ctx.memory.seed) -
        tieBreak(`${b.x},${b.y}`, ctx.memory.seed),
  )[0];
};

/** Место сбора: свободная известная клетка у ратуши в сторону цели. */
const pickRally = (ctx: AiContext, target: Position | null) => {
  const { base } = ctx;
  if (!base) return null;
  const toward = target ?? { x: ctx.width / 2, y: ctx.height / 2 };
  let best: Position | null = null;
  let bestScore = Infinity;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const cell = { x: base.x + dx, y: base.y + dy };
      const dist = manhattan(cell, base);
      if (dist < 2 || dist > 3 || !ctx.inside(cell)) continue;
      if (ctx.grid(1)[cell.y][cell.x] === 0) continue;
      const score = manhattan(cell, toward);
      if (score < bestScore) {
        best = cell;
        bestScore = score;
      }
    }
  }
  return best;
};

/** Юниты группы у места сбора. */
const gathered = (group: MilitaryUnit[], rally: Position) =>
  group.filter(unit => manhattan(unit, rally) <= 3).length;

/**
 * Пересматривает операцию и гарнизон в начале хода и после изменений.
 * Переходы: сбор → движение → бой → отход → сбор. Отзыв из наступления —
 * только при серьёзной угрозе ратуше, не из-за одного слабого контакта.
 *
 * @returns Новая операция и состав гарнизона.
 */
export const planOperation = (
  ctx: AiContext,
): { operation: AiOperation; garrison: string[] } => {
  const { config, memory, base } = ctx;
  const turn = ctx.obs.turn;
  const alive = new Set(ctx.military.map(({ id }) => id));
  const alarm = baseAlarm(ctx);

  // Гарнизон нужен при известной угрозе базе или стратегии G10.
  const wantsGarrison =
    alarm.length > 0 || memory.strategy === 'G10' || memory.strategy === 'G01';
  let garrison = memory.garrison.filter(id => alive.has(id));
  if (wantsGarrison && base && garrison.length < config.garrisonSize) {
    const free = ctx.military
      .filter(({ id }) => !garrison.includes(id))
      .sort((a, b) => manhattan(a, base) - manhattan(b, base));
    garrison = [
      ...garrison,
      ...free.slice(0, config.garrisonSize - garrison.length).map(u => u.id),
    ];
  }
  if (!wantsGarrison) garrison = [];

  const ctxWithGarrison = { ...ctx, memory: { ...memory, garrison } };
  const group = strikeGroup(ctxWithGarrison);
  const op = memory.operation;
  const target = pickTarget(ctx) ?? op.target;
  const rally = pickRally(ctx, target);
  const next = (phase: AiOperation['phase'], goal = target): AiOperation => ({
    phase,
    target: goal,
    rally,
    since: phase === op.phase ? op.since : turn,
  });

  const alarmPower = alarm.reduce((s, e) => s + powerOf(e.type, e.hp), 0);
  const defense = garrisonUnits(ctxWithGarrison).reduce(
    (s, u) => s + powerOf(u.type, u.hp),
    0,
  );
  const serious = alarm.length > 0 && alarmPower > defense;
  if (serious && op.phase !== 'gather') {
    return { operation: next('retreat'), garrison };
  }

  const ownNear = (p: Position) =>
    group.filter(unit => manhattan(unit, p) <= 4);
  const foesNear = group.some(unit =>
    ctx.enemies.some(enemy => enemy.armed && manhattan(enemy, unit) <= 4),
  );

  switch (op.phase) {
    case 'gather': {
      const { size, raidSize, gatherTimeout, readyShare } = config.strikeGroup;
      const attackPlan = memory.strategy === 'G08' || memory.strategy === 'G09';
      const needed = memory.strategy === 'G09' ? raidSize : size;
      const ready =
        !!rally &&
        group.length >= needed &&
        gathered(group, rally) >= Math.ceil(group.length * readyShare);
      const timedOut = turn - op.since >= gatherTimeout && group.length >= 2;
      return {
        operation:
          target && ((attackPlan && ready) || timedOut)
            ? next('advance')
            : next('gather'),
        garrison,
      };
    }
    case 'advance':
    case 'engage': {
      if (memory.strategy === 'G11') {
        return { operation: next('retreat'), garrison };
      }
      if (!group.length) return { operation: next('gather'), garrison };
      // Цель потеряна: идём к её последнему месту, затем к границе.
      const lost =
        op.target &&
        ctx.obs.visible[op.target.y]?.[op.target.x] &&
        !enemyTarget(ctx);
      const goal = lost ? (pickTarget(ctx) ?? op.target) : target;
      return {
        operation: next(foesNear ? 'engage' : 'advance', goal),
        garrison,
      };
    }
    case 'retreat': {
      const home = base ?? rally;
      const back = !home || ownNear(home).length >= Math.ceil(group.length / 2);
      const safe = enemyPower(ctx) === 0 || !foesNear;
      return {
        operation: back && safe ? next('gather') : next('retreat'),
        garrison,
      };
    }
  }
};

/** Ближайший к юниту вражеский объект из видимых вооружённых. */
export const nearestArmed = (ctx: AiContext, from: Position) =>
  nearest(
    from,
    ctx.enemies.filter(({ armed }) => armed),
  );
