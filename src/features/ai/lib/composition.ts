import {
  ARMOR,
  FORMATION_ARMOR,
  HITS_AIR,
  type BuildingType,
  type MilitaryUnit,
  type Unit,
  type UnitType,
} from '@shared/config';
import {
  getTargetCategory,
  hasFormationNeighbor,
  isFlyingType,
} from '@shared/lib';
import type { AiContext } from './context';
import { basesKnown, enemyTarget, ofRival } from './facts';
import { effectiveness, powerOf } from './stats';

/**
 * Состав армий: сила сторон против известного состава и пожелания новых
 * ролей. Только видимое и запомненное — скрытых юнитов здесь нет.
 */

/**
 * Известные вооружённые юниты выбранного противника: против них считается
 * своя сила. Чужие армии наступление на него не обесценивают.
 */
const enemyArmy = (ctx: AiContext) =>
  ofRival(ctx, [...ctx.enemies, ...ctx.remembered])
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
 * Сила выбранного противника по видимым и запомненным объектам с весом
 * достоверности и той же поправкой против своей армии; пока его армия не
 * видна, закладывается половина своей силы.
 */
export const enemyPower = (ctx: AiContext) => {
  const army = asTargets(ctx, ctx.military);
  const foes = ofRival(ctx, [...ctx.enemies, ...ctx.remembered]);
  const known = foes.reduce(
    (sum, enemy) =>
      sum +
      powerOf(enemy.type, enemy.hp) *
        effectiveness(enemy.type, army) *
        enemy.certainty,
    0,
  );
  const seenArmed = foes.some(({ armed, kind }) => armed && kind === 'unit');
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
  const cavalry = foes.filter(
    ({ type }) => getTargetCategory(type) === 'cavalry',
  ).length;
  // Кто у врага бьёт воздух с земли: стрелки, маги, башни.
  const antiAir = [...ctx.enemies, ...ctx.remembered].filter(
    ({ type }) => HITS_AIR.includes(type) && type !== 'griffon',
  ).length;
  // Доля армии под роль: потолок держит состав смешанным.
  const share = (per: number) => Math.floor(army / per);
  const armored = foes.filter(({ type }) => (ARMOR[type] ?? 0) > 0).length;
  const slowFoot = seen('swordsman') + seen('spearman');
  const soft = foes.filter(({ type }) =>
    ['ranged', 'siege'].includes(getTargetCategory(type)),
  ).length;
  const wishes: [boolean, UnitType, BuildingType, string][] = [
    // Копейщик — ответ на конницу: один на двух конных врага.
    [
      own('spearman') < Math.ceil(cavalry / 2),
      'spearman',
      'barracks',
      'у врага конница',
    ],
    // Воздух без зенитчиков врага — в приоритете: грифон бьёт безнаказанно.
    [
      antiAir <= 1 &&
        army >= 4 &&
        own('griffon') < (antiAir === 0 ? 1 + share(5) : 1),
      'griffon',
      'sanctuary',
      antiAir === 0
        ? 'у врага нет защиты от воздуха'
        : 'у врага мало защиты от воздуха',
    ],
    [flyers > own('mage'), 'mage', 'sanctuary', 'у врага летающие'],
    // Магия проходит сквозь броню копейщиков, конницы и грифонов.
    [
      armored >= 2 && army >= 3 && own('mage') < 1 + share(6),
      'mage',
      'sanctuary',
      'у врага броня',
    ],
    [
      flyers > own('mage') + own('horseArcher'),
      'horseArcher',
      'stable',
      'у врага летающие',
    ],
    // Латник ломает пехоту, но копейщики врага его встречают с бонусом.
    [
      seen('swordsman') >= 2 &&
        seen('spearman') < seen('swordsman') &&
        army >= 3 &&
        own('knight') < Math.ceil(army / 4),
      'knight',
      'stable',
      'у врага мечники без копейщиков',
    ],
    [
      army >= 6 && seen('spearman') < 2 && own('knight') < share(6),
      'knight',
      'stable',
      'ударной группе нужен таран',
    ],
    // Медленную пехоту конный лучник обстреливает, не подпуская вплотную.
    [
      slowFoot >= 3 && army >= 4 && own('horseArcher') < Math.max(1, share(5)),
      'horseArcher',
      'stable',
      'против медленной пехоты',
    ],
    [own('scout') === 0 && !basesKnown(ctx), 'scout', 'base', 'нужна разведка'],
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
      soft >= 2 && own('rider') < 2 && army >= 3,
      'rider',
      'stable',
      'у врага стрелки и осада',
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
  const armed = ctx.enemies.filter(
    enemy => enemy.armed && group.some(unit => ctx.reaches(enemy, unit)),
  );
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
