import { MOVE_COST, type ParticipantId, type Position } from '@shared/config';
import { blocksLastPassage, isHostile, type AccessMap } from '@shared/lib';
import { useBuildingsStore } from '@entities/buildings';
import { useMapStore } from '@entities/maps';
import {
  getKnownCellType,
  getParticipantKnowledge,
} from '@entities/perceptions';

/**
 * Известная участнику карта проходов: запомненный рельеф, свои здания и
 * известные чужие здания — стены; неразведанные клетки проходимы и считаются
 * границей разведки. Юниты не учитываются: они не постоянная стена.
 *
 * @param actor - Участник, который строит.
 */
const getKnownAccessMap = (actor: ParticipantId): AccessMap => {
  const { grid } = useMapStore.getState();
  const width = grid[0]?.length ?? 0;
  const knowledge = getParticipantKnowledge(actor);
  const buildings = Object.values(useBuildingsStore.getState().buildings);
  const own = buildings.filter(({ owner }) => owner === actor);

  const walls = new Set(own.map(({ x, y }) => y * width + x));
  const enemies: Position[] = Object.values(knowledge?.contacts ?? {}).filter(
    contact => contact.kind === 'building' && isHostile(actor, contact.owner),
  );
  for (const { x, y } of enemies) walls.add(y * width + x);

  // Без знаний (например, в тесте без системы видимости) — настоящий рельеф.
  const typeAt = (x: number, y: number) =>
    knowledge ? getKnownCellType(knowledge, x, y) : grid[y]?.[x]?.type;

  return {
    width,
    height: grid.length,
    passable: (x, y) => {
      if (walls.has(y * width + x)) return false;
      const type = typeAt(x, y);
      return !type || MOVE_COST[type] !== undefined;
    },
    isFrontier: (x, y) =>
      !typeAt(x, y) ||
      enemies.some(e => Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) === 1),
    buildings: own.filter(({ type }) => type !== 'base'),
    base: own.find(({ type }) => type === 'base') ?? null,
  };
};

/**
 * Перекроет ли здание на клетке последний известный участнику проход
 * к его ратуше, зданиям или границе разведки. Одна проверка для команды,
 * подсветки и ИИ.
 *
 * @param actor - Участник, который строит.
 * @param placement - Клетка нового здания.
 */
export const isPlacementBlocking = (
  actor: ParticipantId,
  placement: Position,
) => blocksLastPassage(getKnownAccessMap(actor), placement);
