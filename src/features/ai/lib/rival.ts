import type { ParticipantId } from '@shared/config';
import type { AiMemory } from '@entities/ai-memories';
import { ownPower } from './composition';
import type { AiContext, EnemyView } from './context';
import { baseAlarm } from './facts';
import { manhattan, tieBreak } from './geometry';
import { powerOf } from './stats';

/** Видимая сила объектов с весом достоверности. */
const powerSum = (foes: EnemyView[]) =>
  foes.reduce((sum, foe) => sum + powerOf(foe.type, foe.hp) * foe.certainty, 0);

/**
 * Выбирает противника для наступления. Нападение на ратушу сразу делает
 * целью сильнейшего из нападающих, пока выбранный сам не среди них; иначе
 * выбор держится `rivalHold` ходов и раньше меняется, только если
 * противник выбыл.
 * Лучший — ближе по известным зданиям и слабее по видимой силе.
 * Опирается только на наблюдение и память стороны.
 *
 * @returns Выбор для памяти; `null` — о противниках ничего не известно.
 */
export const chooseRival = (ctx: AiContext): AiMemory['rival'] => {
  const turn = ctx.obs.turn;
  const current = ctx.memory.rival ?? null;
  const keep = (owner: ParticipantId) =>
    current?.owner === owner ? current : { owner, since: turn };

  const alarm = baseAlarm(ctx);
  if (alarm.length) {
    // Выбранный среди нападающих — держим, иначе потеря HP в бою меняет цель.
    if (alarm.some(foe => foe.owner === current?.owner)) return current;
    const attacker = ctx.obs.opponents
      .map(owner => ({
        owner,
        power: powerSum(alarm.filter(foe => foe.owner === owner)),
      }))
      .sort((a, b) => b.power - a.power)[0];
    if (attacker?.power) return keep(attacker.owner);
  }

  const known = [...ctx.enemies, ...ctx.remembered];
  const owners = ctx.obs.opponents.filter(owner =>
    known.some(foe => foe.owner === owner),
  );
  // Удержание — по живым соперникам: забытый контакт противника не меняет.
  if (
    current &&
    ctx.obs.opponents.includes(current.owner) &&
    turn - current.since < ctx.config.rivalHold
  )
    return current;

  const from = ctx.base ?? ctx.obs.ownUnits[0];
  // Своя сила — против всех известных, без поправки на прежний выбор.
  const own = Math.max(
    1,
    ownPower({ ...ctx, memory: { ...ctx.memory, rival: null } }),
  );
  // Расстояние — по зданиям, если они известны хоть у кого-то: их юниты бродят.
  const anyBuilding = known.some(({ kind }) => kind === 'building');
  const cost = (owner: ParticipantId) => {
    const foes = known.filter(foe => foe.owner === owner);
    const places = foes.filter(
      ({ kind }) => !anyBuilding || kind === 'building',
    );
    if (!from || !places.length) return Infinity;
    const distance = Math.min(...places.map(foe => manhattan(foe, from)));
    return distance * (1 + powerSum(foes) / own);
  };
  const best = owners
    .map(owner => ({ owner, cost: cost(owner) }))
    .sort(
      (a, b) =>
        a.cost - b.cost ||
        tieBreak(a.owner, ctx.memory.seed) - tieBreak(b.owner, ctx.memory.seed),
    )[0];
  if (!best || best.cost === Infinity) return null;
  return keep(best.owner);
};
