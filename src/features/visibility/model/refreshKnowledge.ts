import {
  CARTOGRAPHY_EXTRA_MEMORY,
  type Building,
  type Owner,
  type ParticipantId,
  type Unit,
} from '@shared/config';
import {
  computeVisibility,
  gameEvents,
  getSightSources,
  getShelteredIds,
  isCellVisible,
  isHostile,
} from '@shared/lib';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import { useGameLoopStore } from '@entities/games';
import { hasResearch } from '@entities/researches';
import {
  observe,
  useKnowledgeStore,
  type Contact,
  type ParticipantKnowledge,
  type StrikeSighting,
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
  const { grid } = useMapStore.getState();
  const width = grid[0]?.length ?? 0;
  const units = Object.values(useUnitsStore.getState().units);
  const buildings = Object.values(useBuildingsStore.getState().buildings);
  // Рабочего внутри здания снаружи не видно.
  const sheltered = getShelteredIds(units, buildings);
  const scouts = getSightSources(
    owner,
    units.filter(({ type }) => type === 'scout'),
    grid,
  );
  const pick =
    (kind: Contact['kind']) =>
    (entity: Unit | Building): Omit<Contact, 'seenTurn'>[] =>
      isHostile(owner, entity.owner) &&
      !sheltered.has(entity.id) &&
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
              ...(kind === 'unit' && isCellVisible(scouts, entity.x, entity.y)
                ? { byScout: true }
                : {}),
            },
          ]
        : [];

  return [
    ...units.flatMap(pick('unit')),
    ...buildings.flatMap(pick('building')),
  ];
};

/**
 * Подготовленные удары мира глазами участника. Отметка открыта, если
 * у стороны орудия нет Скрытой наводки, если орудие своё или союзное, или
 * если клетка цели в обзоре разведчика наблюдателя.
 *
 * @param owner - Наблюдающий участник.
 */
export const getStrikeSightings = (owner: Owner): StrikeSighting[] => {
  const units = Object.values(useUnitsStore.getState().units);
  const sieges = units.filter(
    unit => unit.role === 'military' && unit.preparedStrike,
  );
  if (sieges.length === 0) return [];
  const scouts = getSightSources(
    owner,
    units.filter(({ type }) => type === 'scout'),
    useMapStore.getState().grid,
  );
  return sieges.flatMap(siege => {
    if (siege.role !== 'military' || !siege.preparedStrike) return [];
    const { x, y } = siege.preparedStrike;
    const seen =
      !isHostile(owner, siege.owner) ||
      !hasResearch(siege.owner, 'hiddenAiming') ||
      isCellVisible(scouts, x, y);
    return [{ id: siege.id, x, y, seen }];
  });
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
      scoutMemoryBonus: hasResearch(id, 'cartography')
        ? CARTOGRAPHY_EXTRA_MEMORY
        : 0,
      strikes: getStrikeSightings(id),
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
