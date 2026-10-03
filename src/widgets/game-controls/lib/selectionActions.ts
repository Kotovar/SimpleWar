import {
  HEALING,
  REJECTION_MESSAGE,
  RESEARCH_CONFIG,
  RESEARCH_TYPES,
  SIEGE_STRIKE,
  UNITS_CONFIG,
  UNITS_NAME,
  type Building,
  type Unit,
  type UnitType,
} from '@shared/config';
import { canSpawnUnit } from '@shared/lib';
import {
  action,
  slot,
  type ActionButton,
  type SelectionActionInput,
} from './actionButton';
import { workerActions } from './workerActions';

export type { ActionButton, SelectionActionInput } from './actionButton';

/** Характеристики юнита для подсказки найма: HP, урон или лечение, дальность, ход. */
export const unitStats = (type: UnitType) => {
  const config = UNITS_CONFIG[type];
  const heal = HEALING[type]?.amount;
  const range =
    type === 'siege'
      ? `${SIEGE_STRIKE.minRange}–${SIEGE_STRIKE.maxRange}`
      : 'attackRange' in config && config.attackRange;
  return [
    `${config.maxHp} HP`,
    heal
      ? `лечение +${heal} HP`
      : 'attack' in config && `урон ${config.attack}`,
    range && `дальность ${range}`,
    `ход ${config.maxMovePoints}`,
  ]
    .filter(Boolean)
    .join(' · ');
};

const siegeActions = (
  unit: Unit,
  { mode }: SelectionActionInput,
): ActionButton[] => {
  if (unit.role !== 'military' || unit.type !== 'siege') return [];
  const reason = unit.preparedStrike
    ? 'Удар уже подготовлен'
    : unit.attackPoints > 0
      ? undefined
      : 'Нет боевого действия';
  return [
    action('prepareStrike', {
      pressed: mode.striking,
      reason: mode.striking ? undefined : reason,
    }),
  ];
};

const spawnSlots = (
  building: Building,
  { payableSpawn, population, mode }: SelectionActionInput,
): ActionButton[] =>
  building.role !== 'production'
    ? []
    : building.spawningUnits.map((type, index) => {
        const check = canSpawnUnit(
          type,
          payableSpawn,
          population,
          building.spawnPoints,
        );
        const { cost, requiresLimit } = UNITS_CONFIG[type];
        return {
          id: `spawn:${type}`,
          label: UNITS_NAME[type],
          code: slot(index),
          hint: `${UNITS_NAME[type]}: ${unitStats(type)}`,
          reason: check.canSpawn ? undefined : check.message,
          pressed: mode.unit === type,
          cost: { ...cost, population: requiresLimit },
          portrait: type,
        };
      });

const researchSlots = ({
  researched,
  researching,
  stock,
}: SelectionActionInput): ActionButton[] =>
  RESEARCH_TYPES.map((type, index) => {
    const { name, effect, cost } = RESEARCH_CONFIG[type];
    const reason = researched.includes(type)
      ? REJECTION_MESSAGE.researched
      : researching
        ? REJECTION_MESSAGE.researching
        : stock.gold < cost.gold || stock.wood < cost.wood
          ? REJECTION_MESSAGE.resources
          : undefined;
    return {
      id: `research:${type}`,
      label: name,
      code: slot(index),
      hint: effect,
      reason,
      pressed: researching === type,
      cost,
    };
  });

const buildingActions = (
  building: Building,
  input: SelectionActionInput,
): ActionButton[] => {
  const buttons = [...spawnSlots(building, input)];
  if (building.type === 'forge') {
    buttons.push(...researchSlots(input));
    if (input.researching) buttons.push(action('cancelResearch'));
  }
  if (building.role === 'resource') {
    const reason = input.workerInside ? undefined : 'Внутри нет рабочего';
    buttons.push(
      action('pickWorker', { reason }),
      action('unassign', { reason }),
    );
  }
  if (building.role === 'production')
    buttons.push(action('rallyPoint', { pressed: input.mode.rally }), {
      ...action('cancelOrder', {
        hint: 'Новые юниты останутся у здания; приказы уже нанятых не меняются',
        reason: building.rallyPoint ? undefined : 'Точка сбора не задана',
      }),
      label: 'Снять точку сбора',
    });
  if (building.type !== 'base') buttons.push(action('demolish'));
  return buttons;
};

/**
 * Кнопки нижней панели для своего выбранного объекта: порядок постоянный,
 * недоступные остаются на месте с причиной — так клавиши не «прыгают».
 *
 * @param input - Выбранное и состояние стороны.
 * @returns Кнопки; пусто — у выбранного нет действий в панели.
 */
export const getSelectionActions = (
  input: SelectionActionInput,
): ActionButton[] => {
  const buttons = input.unit
    ? [
        ...workerActions(input.unit, input),
        ...siegeActions(input.unit, input),
        ...(input.unit.type === 'scout'
          ? [
              action('explore', {
                pressed:
                  input.unit.order?.type === 'explore' &&
                  !input.unit.order.stopped,
              }),
            ]
          : []),
        ...(input.unit.order ? [action('cancelOrder')] : []),
        action('skip', {
          pressed: input.unit.restMode === 'skip',
          reason:
            input.unit.restMode === 'skip' ? 'Уже пропустил ход' : undefined,
        }),
        {
          ...action('sleep', { pressed: input.unit.restMode === 'sleep' }),
          label: input.unit.restMode === 'sleep' ? 'Разбудить' : 'Спать',
        },
      ]
    : input.building
      ? buildingActions(input.building, input)
      : [];
  if (input.isTurn) return buttons;
  const notTurn = (button: ActionButton): ActionButton => ({
    ...button,
    reason: REJECTION_MESSAGE.turn,
    children: button.children?.map(notTurn),
  });
  return buttons.map(notTurn);
};
