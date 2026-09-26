import {
  MOVE_COST,
  UNKNOWN_MOVE_COST,
  type ParticipantId,
} from '@shared/config';
import {
  computeVisibility,
  getMoveCost,
  getSightSources,
  type MovementGrid,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import {
  getKnownCellType,
  getParticipantKnowledge,
} from '@entities/perceptions';
import { isCellOccupied } from './isCellOccupied';

/** Наименьшая цена входа: оценка неизвестной клетки для приказа на ход. */
export const TURN_UNKNOWN_COST = 1;

/**
 * Видимые участнику клетки по текущему миру. Считается на месте, поэтому
 * проверка команды не зависит от того, успели ли обновиться знания.
 *
 * @param actor - Участник.
 * @returns Маска `1` — клетка видна, индекс `y * width + x`.
 */
export const getActorVisibility = (actor: ParticipantId) => {
  const { grid } = useMapStore.getState();
  const viewers = [
    ...Object.values(useUnitsStore.getState().units),
    ...Object.values(useBuildingsStore.getState().buildings),
  ];
  return computeVisibility(
    grid[0]?.length ?? 0,
    grid.length,
    getSightSources(actor, viewers, grid),
  );
};

/**
 * Видна ли клетка участнику прямо сейчас.
 *
 * @param actor - Участник.
 * @param x - Столбец клетки.
 * @param y - Строка клетки.
 */
export const isVisibleTo = (actor: ParticipantId, x: number, y: number) => {
  const width = useMapStore.getState().grid[0]?.length ?? 0;
  if (x < 0 || y < 0 || x >= width) return false;
  return getActorVisibility(actor)[y * width + x] === 1;
};

/**
 * Цены входа по известной участнику карте. Видимые клетки — настоящая
 * местность и занятость; разведанные — запомненная местность и снимки
 * зданий; неизвестные — предположение о проходе. Скрытые юниты
 * и изменения мира на маршрут не влияют.
 *
 * @param actor - Участник, планирующий маршрут.
 * @param unknownCost - Предполагаемая цена неизвестной клетки: повышенная
 *   для маршрутов ИИ на несколько ходов, наименьшая (1) для приказа на
 *   текущий ход — реальность остановит юнита, если клетка дороже.
 * @returns Цены входа; `0` — войти нельзя по известным сведениям.
 */
export const createKnownMovementGrid = (
  actor: ParticipantId,
  unknownCost = UNKNOWN_MOVE_COST,
): MovementGrid => {
  const { grid } = useMapStore.getState();
  const width = grid[0]?.length ?? 0;
  const visible = getActorVisibility(actor);
  const knowledge = getParticipantKnowledge(actor);
  const remembered = new Set(
    Object.values(knowledge?.contacts ?? {})
      .filter(({ kind }) => kind === 'building')
      .map(({ x, y }) => y * width + x),
  );

  return grid.map((row, y) =>
    row.map((cell, x) => {
      const index = y * width + x;
      if (visible[index]) {
        return isCellOccupied(x, y) ? 0 : getMoveCost(cell);
      }
      const known = getKnownCellType(knowledge, x, y);
      if (!known) return unknownCost;
      return remembered.has(index) ? 0 : (MOVE_COST[known] ?? 0);
    }),
  );
};
