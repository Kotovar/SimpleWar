import type { BuildingType, InstanceKeys } from './buildings';
import type { Owner } from './common';
import type { Cost } from './economy';
import type { RejectionCode } from './commands';

/** Список военных юнитов. */
export type MilitaryType =
  | 'swordsman'
  | 'archer'
  | 'scout'
  | 'spearman'
  | 'rider'
  | 'siege'
  | 'mage'
  | 'healer'
  | 'griffon';

/** Список гражданских юнитов. */
export type CivilType = 'worker';

/** Все типы юнитов. */
export type UnitType = MilitaryType | CivilType;

/** Роль юнита: военный или гражданский. */
type UnitRole = 'military' | 'civil';

/**
 * Сохраняемый приказ движения, стройки или назначения на работу. `stopped` — почему исполнение
 * остановилось (`enemy` — в обзоре новый враг); такой приказ больше не
 * исполняется и ждёт решения игрока.
 */
export type UnitOrder = (
  | { type: 'goto' }
  | { type: 'build'; buildingType: BuildingType }
  | { type: 'work'; buildingId: string }
) & {
  x: number;
  y: number;
  stopped?: RejectionCode | 'enemy';
};

/** Базовая форма юнита, общая для всех ролей. */
type BaseUnit = {
  id: string;
  type: MilitaryType | CivilType;
  role: UnitRole;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  movePoints: number;
  maxMovePoints: number;
  /** Радиус обзора по Manhattan; не связан с дальностью атаки. */
  sightRange: number;
  owner: Owner;
  /** Пропуск до следующего своего хода или сон до пробуждения; нет — активен. */
  restMode?: 'skip' | 'sleep';
  /** Приказ на несколько ходов; снимается прибытием или прямым приказом. */
  order?: UnitOrder;
  requiresLimit: number;
  cost: Cost;
};

/** Военный юнит */
export type MilitaryUnit = {
  role: 'military';
  attack: number;
  attackPoints: number;
  attackRange: number;
  maxAttackPoints: number;
  /**
   * Подготовленный удар осадной машины по клетке: исполнится в начале
   * следующего своего хода. У других юнитов всегда `null`.
   */
  preparedStrike: { x: number; y: number } | null;
} & BaseUnit;

/** Гражданский юнит */
export type CivilUnit = {
  role: 'civil';
  canBuild: boolean;
  buildableBuildings: BuildingType[];
  buildPoints: number;
  maxBuildPoints: number;
  /**
   * Рудник или лесопилка, где рабочий добывает; `null` — без работы.
   * Связь хранится только здесь: занятость здания ищется по рабочим.
   */
  workplaceId: string | null;
} & BaseUnit;

/** Любой юнит в зависимости от роли. */
export type Unit = MilitaryUnit | CivilUnit;

/** Статический конфиг боевых юнитов. */
export const MILITARY_UNITS_CONFIG: Record<
  MilitaryType,
  Omit<MilitaryUnit, InstanceKeys>
> = {
  swordsman: {
    maxHp: 110,
    sightRange: 3,
    attack: 18,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 90, wood: 0 },
    preparedStrike: null,
  },
  archer: {
    maxHp: 55,
    sightRange: 4,
    attack: 22,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 3,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 110, wood: 120 },
    preparedStrike: null,
  },
  // Большой обзор и скорость, слабый бой: ищет цели и ресурсы.
  scout: {
    maxHp: 45,
    sightRange: 6,
    attack: 6,
    movePoints: 0,
    maxMovePoints: 5,
    attackPoints: 0,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 1,
    cost: { gold: 50, wood: 20 },
    preparedStrike: null,
  },
  // Слабее мечника в обычном бою, но с бонусом против конницы.
  spearman: {
    maxHp: 100,
    sightRange: 3,
    attack: 14,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 70, wood: 40 },
    preparedStrike: null,
  },
  // Быстрый рейд по рабочим и стрелкам; уязвим для копейщиков.
  rider: {
    maxHp: 90,
    sightRange: 4,
    attack: 16,
    movePoints: 0,
    maxMovePoints: 5,
    attackPoints: 0,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 3,
    cost: { gold: 120, wood: 60 },
    preparedStrike: null,
  },
  /**
   * Бьёт только подготовленным ударом по клетке в дальности 2–5
   * (`SIEGE_STRIKE`): сильно по зданиям, слабо по войскам.
   */
  siege: {
    maxHp: 70,
    sightRange: 2,
    attack: 12,
    movePoints: 0,
    maxMovePoints: 2,
    attackPoints: 0,
    attackRange: 5,
    maxAttackPoints: 1,
    requiresLimit: 3,
    cost: { gold: 150, wood: 150 },
    preparedStrike: null,
  },
  // Магическая атака: броня не защищает, здания держат магию хорошо.
  mage: {
    maxHp: 50,
    sightRange: 3,
    attack: 20,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 3,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 120, wood: 80 },
    preparedStrike: null,
  },
  /**
   * Не атакует: боевое действие тратит на лечение своего юнита
   * (`HEALING`); `attackRange` — дальность лечения.
   */
  healer: {
    maxHp: 45,
    sightRange: 3,
    attack: 0,
    movePoints: 0,
    maxMovePoints: 3,
    attackPoints: 0,
    attackRange: 2,
    maxAttackPoints: 1,
    requiresLimit: 2,
    cost: { gold: 90, wood: 60 },
    preparedStrike: null,
  },
  // Летает над водой, горами и лесом; бьёт землю и воздух.
  griffon: {
    maxHp: 85,
    sightRange: 4,
    attack: 17,
    movePoints: 0,
    maxMovePoints: 5,
    attackPoints: 0,
    attackRange: 1,
    maxAttackPoints: 1,
    requiresLimit: 3,
    cost: { gold: 150, wood: 120 },
    preparedStrike: null,
  },
};

/** Статический конфиг гражданских юнитов. */
export const CIVIL_UNITS_CONFIG: Record<
  CivilType,
  Omit<CivilUnit, InstanceKeys>
> = {
  worker: {
    maxHp: 25,
    sightRange: 3,
    movePoints: 0,
    maxMovePoints: 4,
    buildPoints: 0,
    maxBuildPoints: 1,
    canBuild: true,
    workplaceId: null,
    buildableBuildings: [
      'mine',
      'sawmill',
      'farm',
      'barracks',
      'tower',
      'stable',
      'workshop',
      'forge',
      'sanctuary',
      'palisade',
    ],
    requiresLimit: 1,
    cost: { gold: 40, wood: 40 },
  },
};

/** Объединённый конфиг всех юнитов по их типам. */
export const UNITS_CONFIG = {
  ...MILITARY_UNITS_CONFIG,
  ...CIVIL_UNITS_CONFIG,
};
