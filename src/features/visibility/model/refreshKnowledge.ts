import type { Building, Owner, ParticipantId, Unit } from '@shared/config';
import {
  computeVisibility,
  gameEvents,
  getSightSources,
  isHostile,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import {
  observe,
  useKnowledgeStore,
  type Contact,
  type ParticipantKnowledge,
} from '@entities/perceptions';

/**
 * Видимые участнику клетки по текущему миру: объединение обзора его
 * живых юнитов и зданий.
 *
 * @param owner - Участник.
 * @returns Маска `1` — клетка видна, индекс `y * width + x`.
 */
export const computeVisibleMask = (owner: Owner) => {
  const { grid } = useMapStore.getState();
  const viewers = [
    ...Object.values(useUnitsStore.getState().units),
    ...Object.values(useBuildingsStore.getState().buildings),
  ];
  return computeVisibility(
    grid[0]?.length ?? 0,
    grid.length,
    getSightSources(owner, viewers, grid),
  );
};

/**
 * Вражеские объекты в видимых клетках: только наблюдаемые поля, без
 * очков действий, цены и прочих скрытых сведений.
 *
 * @param owner - Наблюдающий участник.
 * @param visible - Его маска видимости.
 */
export const getVisibleEnemies = (
  owner: Owner,
  visible: Uint8Array,
): Omit<Contact, 'seenTurn'>[] => {
  const width = useMapStore.getState().grid[0]?.length ?? 0;
  const pick =
    (kind: Contact['kind']) =>
    (entity: Unit | Building): Omit<Contact, 'seenTurn'>[] =>
      isHostile(owner, entity.owner) &&
      visible[entity.y * width + entity.x] === 1
        ? [
            {
              id: entity.id,
              kind,
              type: entity.type,
              owner: entity.owner,
              x: entity.x,
              y: entity.y,
              hp: entity.hp,
              maxHp: entity.maxHp,
            },
          ]
        : [];

  return [
    ...Object.values(useUnitsStore.getState().units).flatMap(pick('unit')),
    ...Object.values(useBuildingsStore.getState().buildings).flatMap(
      pick('building'),
    ),
  ];
};

/**
 * Пересчитывает знания всех участников партии по текущему миру.
 * Полный пересчёт дешёв даже на 100 × 100 и не оставляет обзор погибшего
 * источника. Выбывшие участники больше не наблюдают.
 */
export const refreshKnowledge = () => {
  const { grid } = useMapStore.getState();
  const { participants, eliminated, currentTurn } = useGameLoopStore.getState();
  const { byParticipant, setKnowledge } = useKnowledgeStore.getState();
  if (grid.length === 0) {
    if (Object.keys(byParticipant).length) setKnowledge({});
    return;
  }

  const next: Partial<Record<ParticipantId, ParticipantKnowledge>> = {};
  const eliminatedIds = new Set(eliminated);
  let changed = false;
  for (const { id } of participants) {
    const previous = byParticipant[id];
    if (eliminatedIds.has(id)) {
      if (previous) next[id] = previous;
      continue;
    }
    const visible = computeVisibleMask(id);
    next[id] = observe(previous, {
      visible,
      grid,
      enemies: getVisibleEnemies(id, visible),
      turn: currentTurn,
      eliminated,
    });
    changed ||= next[id] !== previous;
  }

  if (
    changed ||
    Object.keys(next).length !== Object.keys(byParticipant).length
  ) {
    setKnowledge(next);
  }
};

// Подписка общая для всех партий и не должна дублироваться при повторном монтировании Game.
let initialized = false;

/**
 * Держит знания участников в соответствии с миром: любое изменение
 * позиций, состава, рельефа или очереди ходов сразу обновляет обзор.
 * Подписки синхронны, поэтому каждый шаг движения раскрывает окружение.
 */
export const initVisibilitySystem = () => {
  if (!initialized) {
    initialized = true;
    useUnitsStore.subscribe(refreshKnowledge);
    useBuildingsStore.subscribe(refreshKnowledge);
    useMapStore.subscribe(refreshKnowledge);
    useGameLoopStore.subscribe(refreshKnowledge);
    gameEvents.subscribe(event => {
      if (event.type === 'GAME_RESET') {
        useKnowledgeStore.getState().resetStore();
      }
    });
  }
  refreshKnowledge();
};
