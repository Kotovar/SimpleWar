import {
  FORMATION_ARMOR,
  HITS_AIR,
  type BuildingType,
  type MilitaryUnit,
  type Unit,
  type UnitType,
} from '@shared/config';
import { hasFormationNeighbor, isFlyingType } from '@shared/lib';
import type { AiContext } from './context';
import { enemyTarget } from './facts';
import { effectiveness, powerOf } from './stats';

/**
 * Состав армий: сила сторон против известного состава и пожелания новых
 * ролей. Только видимое и запомненное — скрытых юнитов здесь нет.
 */

/** Известные вооружённые юниты врага: против них считается своя сила. */
const enemyArmy = (ctx: AiContext) =>
  [...ctx.enemies, ...ctx.remembered]
    .filter(({ armed, kind }) => armed && kind === 'unit')
    .map(({ type, armorBonus }) => ({ type, armorBonus }));

/** Своя прибавка Строя: исследование изучено и рядом свой копейщик. */
export const ownArmor = (ctx: AiContext, unit: Unit) =>
  ctx.obs.researched.includes('formation') &&
  hasFormationNeighbor(unit, ctx.obs.ownUnits)
    ? FORMATION_ARMOR
    : 0;

/** Свои юниты как цели врага: тип и бонус Строя. */
const asTargets = (ctx: AiContext, units: Unit[]) =>
  units.map(unit => ({ type: unit.type, armorBonus: ownArmor(ctx, unit) }));

/**
 * Своя сила: военные юниты и башни с поправкой на известный состав врага —
 * защита по типу урона и воздух, который не всякий может поразить.
 */
export const ownPower = (ctx: AiContext) => {
  const army = enemyArmy(ctx);
  return [...ctx.obs.ownUnits, ...ctx.obs.ownBuildings].reduce(
    (sum, entity) =>
      sum + powerOf(entity.type, entity.hp) * effectiveness(entity.type, army),
    0,
  );
};

/**
 * Сила врага по видимым и запомненным объектам с весом достоверности и
 * той же поправкой против своей армии; пока армия врага не видна,
 * закладывается половина своей силы.
 */
export const enemyPower = (ctx: AiContext) => {
  const army = asTargets(ctx, ctx.military);
  const known = [...ctx.enemies, ...ctx.remembered].reduce(
    (sum, enemy) =>
      sum +
      powerOf(enemy.type, enemy.hp) *
        effectiveness(enemy.type, army) *
        enemy.certainty,
    0,
  );
  const seenArmed = [...ctx.enemies, ...ctx.remembered].some(
    ({ armed, kind }) => armed && kind === 'unit',
  );
  return seenArmed ? known : Math.max(known, ownPower(ctx) * 0.5);
};

/** Пожелание состава: какой роли не хватает, где её нанимают и почему. */
export type RoleWish = {
  type: UnitType;
  producer: BuildingType;
  reason: string;
};

/**
 * Какие новые роли нужны по известному составу врага и своей армии, по
 * важности. Опирается только на видимое и запомненное: скрытых юнитов нет.
 * Мечник и лучник остаются за N02.
 */
export const roleWishes = (ctx: AiContext): RoleWish[] => {
  const foes = [...ctx.enemies, ...ctx.remembered].filter(
    ({ kind }) => kind === 'unit',
  );
  const seen = (type: UnitType) => foes.filter(f => f.type === type).length;
  const own = (type: UnitType) =>
    ctx.military.filter(unit => unit.type === type).length;
  const army = ctx.military.length;
  const flyers = foes.filter(({ type }) => isFlyingType(type)).length;
  const antiAir = [...ctx.enemies, ...ctx.remembered].some(
    ({ type }) => HITS_AIR.includes(type) && type !== 'griffon',
  );
  const wishes: [boolean, UnitType, BuildingType, string][] = [
    [
      seen('rider') > own('spearman'),
      'spearman',
      'barracks',
      'у врага конница',
    ],
    [flyers > own('mage'), 'mage', 'sanctuary', 'у врага летающие'],
    [
      own('scout') === 0 && !enemyTarget(ctx),
      'scout',
      'base',
      'нужна разведка',
    ],
    [
      !!enemyTarget(ctx) && army >= 4 && own('siege') < Math.floor(army / 4),
      'siege',
      'workshop',
      'для штурма нужна осада',
    ],
    [
      army >= 4 && own('healer') === 0,
      'healer',
      'sanctuary',
      'отряду нужен лекарь',
    ],
    [
      foes.some(f => !f.armed) && own('rider') < 2 && army >= 3,
      'rider',
      'stable',
      'видна экономика врага',
    ],
    [
      !antiAir && army >= 5 && own('griffon') === 0,
      'griffon',
      'sanctuary',
      'у врага нет защиты от воздуха',
    ],
  ];
  return wishes
    .filter(([wanted]) => wanted)
    .map(([, type, producer, reason]) => ({ type, producer, reason }));
};

/**
 * Соотношение сил в бою (G11): HP × атака с поправкой на эффективность
 * против видимых вооружённых врагов; непоражаемый враг (воздух для
 * мечника) своей силы группе не добавляет. Без врагов — 2.
 */
export const battleRatio = (ctx: AiContext, group: MilitaryUnit[]) => {
  const armed = ctx.enemies.filter(enemy => enemy.armed);
  const foeTypes = armed.map(({ type, armorBonus }) => ({ type, armorBonus }));
  const ownTypes = asTargets(ctx, group);
  const own = group.reduce(
    (sum, unit) =>
      sum + unit.hp * unit.attack * effectiveness(unit.type, foeTypes),
    0,
  );
  const foes = armed.reduce(
    (sum, enemy) =>
      sum + enemy.hp * enemy.attack * effectiveness(enemy.type, ownTypes),
    0,
  );
  return foes > 0 ? own / foes : 2;
};
