import type { ParticipantId, Position, Unit } from '@shared/config';
import { isFlyingType, type MovementGrid } from '@shared/lib';
import { useMapStore } from '@entities/maps';
import { getParticipantKnowledge } from '@entities/perceptions';
import {
  createKnownMovementGrid,
  getActorVisibility,
} from './createKnownMovementGrid';
import { getReachableCells } from './getReachableCells';
import { isCellOccupied } from './isCellOccupied';

/**
 * Цены пролёта: каждая клетка карты стоит 1 — вода, горы, лес и занятые
 * клетки не мешают транзиту. Остановка проверяется отдельно.
 */
export const createAirGrid = (): MovementGrid =>
  useMapStore.getState().grid.map(row => row.map(() => 1));

/**
 * Может ли летающий остановиться на клетке по известным участнику
 * сведениям: видимая — без объекта, вне обзора — без запомненного здания.
 * Скрытая занятость не раскрывается: полёт остановится раньше.
 *
 * @param actor - Участник.
 */
export const createLandingCheck = (actor: ParticipantId) => {
  const width = useMapStore.getState().grid[0]?.length ?? 0;
  const visible = getActorVisibility(actor);
  const remembered = new Set(
    Object.values(getParticipantKnowledge(actor)?.contacts ?? {})
      .filter(({ kind }) => kind === 'building')
      .map(({ x, y }) => y * width + x),
  );
  return ({ x, y }: Position) => {
    const index = y * width + x;
    return visible[index] ? !isCellOccupied(x, y) : !remembered.has(index);
  };
};

/**
 * Цены входа по профилю юнита: летающему — пролёт, наземному — известная
 * карта участника.
 *
 * @param unknownCost - Оценка неизвестной клетки для наземного пути.
 */
export const createUnitMovementGrid = (
  unit: Unit,
  actor: ParticipantId,
  unknownCost: number,
): MovementGrid =>
  isFlyingType(unit.type)
    ? createAirGrid()
    : createKnownMovementGrid(actor, unknownCost);

/**
 * Клетки хода юнита по его профилю: у летающего — в пределах очков и
 * только те, где по известным сведениям можно приземлиться.
 */
export const getUnitReachableCells = (
  unit: Unit,
  actor: ParticipantId,
  unknownCost: number,
): Position[] => {
  const cells = getReachableCells(
    createUnitMovementGrid(unit, actor, unknownCost),
    unit.x,
    unit.y,
    unit.movePoints,
  );
  if (!isFlyingType(unit.type)) return cells;
  const canLand = createLandingCheck(actor);
  return cells.filter(canLand);
};
