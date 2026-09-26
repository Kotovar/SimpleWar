import {
  MOVE_COST,
  type MilitaryUnit,
  type Position,
  type Unit,
} from '@shared/config';
import { blocksLastPassage, type AccessMap } from '@shared/lib';
import type { AiTask } from '@entities/ai-memories';
import type { Candidate } from '../../model/types';
import type { AiContext, EnemyView } from '../context';
import { chebyshev, manhattan } from '../geometry';
import { turnMoves } from '../movement';

/** Исполнитель ещё действует в этом ходу. */
export const isFree = (ctx: AiContext, id: string) => !ctx.turn.done.has(id);

/** Задача юнита, если она есть. */
export const taskOf = (ctx: AiContext, unitId: string): AiTask | undefined =>
  ctx.memory.tasks.find(task => task.unitId === unitId);

/** Предложение движения. */
export const moveTo = (
  ruleId: string,
  unit: Unit,
  cell: Position,
  score: number,
  reason: string,
  extra: Partial<Candidate> = {},
): Candidate => ({
  ruleId,
  group: 'economy',
  actorId: unit.id,
  action: { type: 'move', unitId: unit.id, x: cell.x, y: cell.y },
  score,
  reason,
  ...extra,
});

/** Видимые враги в дальности атаки. Память о врагах целью не бывает. */
export const targetsInRange = (
  ctx: AiContext,
  from: Position,
  range: number,
): EnemyView[] => ctx.enemies.filter(enemy => manhattan(enemy, from) <= range);

/** Сколько урона уже запланировано по цели в этом ходу. */
export const planned = (ctx: AiContext, id: string) =>
  ctx.turn.plannedDamage.get(id) ?? 0;

/** Цель погибнет от удара с учётом общего фокуса. */
export const isKillable = (ctx: AiContext, enemy: EnemyView, damage: number) =>
  enemy.hp - planned(ctx, enemy.id) <= damage;

/** Цель уже будет уничтожена запланированным уроном: не дублировать огонь. */
export const isDoomed = (ctx: AiContext, enemy: EnemyView) =>
  planned(ctx, enemy.id) >= enemy.hp;

/** Предложение атаки с учётом фокуса огня. */
export const attackOf = (
  ruleId: string,
  attacker: { id: string; attack: number },
  target: EnemyView,
  score: number,
  reason: string,
): Candidate => ({
  ruleId,
  group: 'attack',
  actorId: attacker.id,
  action: { type: 'attack', attackerId: attacker.id, targetId: target.id },
  score,
  reason,
  damage: { targetId: target.id, amount: attacker.attack },
  basis: { target: target.type, hp: target.hp, x: target.x, y: target.y },
});

/**
 * Лучшая достижимая в этом ходу клетка по оценке; `null`, если ни одна
 * не лучше текущей.
 */
export const bestMove = (
  ctx: AiContext,
  unit: Unit,
  value: (cell: Position) => number,
): Position | null => {
  let best: Position | null = null;
  let bestValue = value(unit);
  for (const cell of turnMoves(ctx, unit)) {
    const cellValue = value(cell);
    if (cellValue > bestValue) {
      best = cell;
      bestValue = cellValue;
    }
  }
  return best;
};

/** Военный может атаковать в этом ходу. */
export const canAttack = (unit: MilitaryUnit) => unit.attackPoints > 0;

/**
 * Известная участнику карта проходов для проверки последнего прохода —
 * та же модель, что у команды стройки, но только по наблюдению.
 */
export const accessMap = (ctx: AiContext): AccessMap => {
  const buildings = ctx.obs.ownBuildings;
  const walls = new Set<string>();
  for (const { x, y } of buildings) walls.add(`${x},${y}`);
  const enemyBuildings = [...ctx.enemies, ...ctx.remembered].filter(
    ({ kind }) => kind === 'building',
  );
  for (const { x, y } of enemyBuildings) walls.add(`${x},${y}`);
  return {
    width: ctx.width,
    height: ctx.height,
    passable: (x, y) => {
      if (walls.has(`${x},${y}`)) return false;
      const type = ctx.known(x, y);
      return !type || MOVE_COST[type] !== undefined;
    },
    isFrontier: (x, y) =>
      !ctx.known(x, y) ||
      enemyBuildings.some(enemy => chebyshev(enemy, { x, y }) === 1),
    buildings: buildings.filter(({ type }) => type !== 'base'),
    base: ctx.base,
  };
};

/** Перекроет ли постройка последний известный проход. */
export const wouldBlock = (ctx: AiContext, site: Position) =>
  blocksLastPassage(accessMap(ctx), site);

/** Угроза ближнего боя: враги, способные дойти и ударить вплотную. */
export const meleeThreat = (ctx: AiContext, cell: Position) =>
  ctx.enemies.filter(
    enemy =>
      enemy.armed &&
      enemy.range <= 1 &&
      manhattan(enemy, cell) <= enemy.move + 1,
  ).length;

/** Видимые цели в дальности, ещё не обречённые общим фокусом. */
export const liveTargets = (ctx: AiContext, unit: MilitaryUnit) =>
  targetsInRange(ctx, unit, unit.attackRange).filter(
    enemy => !isDoomed(ctx, enemy),
  );
