import {
  BUILDINGS_CONFIG,
  BUILDINGS_NAME,
  REJECTION_MESSAGE,
  REPAIR,
  type Unit,
} from '@shared/config';
import {
  canSpawnBuilding,
  getBuildingInfoText,
  isBuildingUnlocked,
} from '@shared/lib';
import {
  action,
  NO_BUILD_POINT,
  slot,
  type ActionButton,
  type SelectionActionInput,
} from './actionButton';

/**
 * Кнопки своего рабочего: «Построить» с подменю зданий, работа, снятие с
 * работы, расчистка и ремонт. Набор постоянный, недоступное — с причиной.
 */
export const workerActions = (
  unit: Unit,
  input: SelectionActionInput,
): ActionButton[] => {
  if (unit.role !== 'civil') return [];
  const { nearby, takenWorkplaces, mode, payableBuild, researched, stock } =
    input;
  const hasPoint = unit.buildPoints > 0;
  const current = unit.workplaceId;

  const build = action('build', {
    reason: hasPoint ? undefined : NO_BUILD_POINT,
    pressed: mode.building !== null,
    children: unit.buildableBuildings
      .filter(type => isBuildingUnlocked(type, researched))
      .map((type, index) => {
        const check = canSpawnBuilding(type, payableBuild, unit.buildPoints);
        return {
          id: `build:${type}`,
          label: BUILDINGS_NAME[type],
          code: slot(index),
          hint: getBuildingInfoText(type),
          reason: check.canSpawn ? undefined : check.message,
          pressed: mode.building === type,
          cost: BUILDINGS_CONFIG[type].cost,
          portrait: type,
        };
      }),
  });

  const workplaces = nearby.filter(
    ({ role, id }) => role === 'resource' && id !== current,
  );
  const free = workplaces.find(({ id }) => !takenWorkplaces.has(id));
  const work = free
    ? action('work', {
        id: `work:${free.id}`,
        hint: `${BUILDINGS_NAME[free.type]}: +15 ${free.type === 'mine' ? 'золота' : 'дерева'} в конце хода`,
      })
    : action('work', {
        reason: workplaces.length
          ? REJECTION_MESSAGE.workplace
          : 'Рядом нет свободного рудника или лесопилки',
      });

  const unassign = action('unassign', {
    reason: current ? undefined : 'Рабочий не работает в здании',
  });

  const clear = action('clearForest', {
    pressed: mode.clearing,
    reason: hasPoint || mode.clearing ? undefined : NO_BUILD_POINT,
  });

  // Чиним самое повреждённое из соседних своих зданий.
  const damaged = nearby
    .filter(({ hp, maxHp }) => hp < maxHp)
    .sort((a, b) => b.maxHp - b.hp - (a.maxHp - a.hp))[0];
  const canPay =
    stock.gold >= REPAIR.cost.gold && stock.wood >= REPAIR.cost.wood;
  const repair = damaged
    ? action('repair', {
        id: `repair:${damaged.id}`,
        hint: `Починить: ${BUILDINGS_NAME[damaged.type]} (+${Math.min(REPAIR.hp, damaged.maxHp - damaged.hp)} HP)`,
        cost: REPAIR.cost,
        reason: !hasPoint
          ? NO_BUILD_POINT
          : canPay
            ? undefined
            : REJECTION_MESSAGE.resources,
      })
    : action('repair', { reason: 'Рядом нет повреждённых своих зданий' });

  return [build, work, unassign, clear, repair];
};
