import {
  MOVE_COST,
  type Building,
  type Cell,
  type ParticipantId,
  type Unit,
} from '@shared/config';
import {
  getKnownCellType,
  type Contact,
  type ParticipantKnowledge,
} from '@entities/perceptions';

/** Чьими глазами рисуется карта: участник или полный обзор отладки. */
export type SceneView =
  | { mode: 'world' }
  | {
      mode: 'participant';
      viewer: ParticipantId;
      knowledge: ParticipantKnowledge | undefined;
    };

/** Всё, что карте разрешено нарисовать. */
export type Scene = {
  /** Местность для рисования: известная участнику или настоящая. */
  grid: Cell[][];
  /** Свои и видимые чужие юниты — живые объекты. */
  units: Record<string, Unit>;
  /** Свои и видимые чужие здания — живые объекты. */
  buildings: Record<string, Building>;
  /** Запомненные здания вне обзора: устаревший снимок, не цель. */
  snapshots: Contact[];
  /** Знания для тумана; `null` — туман не рисуется. */
  fog: ParticipantKnowledge | null;
};

/**
 * Местность глазами участника: запомненные клетки как их видели, неизвестные —
 * нейтральным полем, чтобы по рисунку нельзя было узнать скрытый рельеф.
 *
 * @param grid - Настоящие клетки: берутся только размеры и координаты.
 * @param knowledge - Знания участника.
 */
export const getKnownGrid = (
  grid: Cell[][],
  knowledge: Pick<ParticipantKnowledge, 'width' | 'terrain'> | undefined,
): Cell[][] =>
  grid.map((row, y) =>
    row.map((_, x) => {
      const type = getKnownCellType(knowledge, x, y) ?? 'grass';
      return { x, y, type, isWalkable: MOVE_COST[type] !== undefined };
    }),
  );

const filterVisible = <
  T extends { owner: ParticipantId; x: number; y: number },
>(
  entities: Record<string, T>,
  viewer: ParticipantId,
  knowledge: ParticipantKnowledge | undefined,
) => {
  const width = knowledge?.width ?? 0;
  const result: Record<string, T> = {};
  for (const [id, entity] of Object.entries(entities)) {
    const isVisible = knowledge?.visible[entity.y * width + entity.x] === 1;
    if (entity.owner === viewer || isVisible) result[id] = entity;
  }
  return result;
};

/**
 * Составляет сцену карты. Скрытые объекты отбрасываются здесь, до
 * рисования: порядок слоёв и прозрачность тумана их не раскрывают.
 *
 * @param world - Настоящие местность, юниты и здания.
 * @param view - Режим обзора.
 * @param knownGrid - Готовая известная местность, чтобы не строить её заново.
 */
export const buildScene = (
  world: {
    grid: Cell[][];
    units: Record<string, Unit>;
    buildings: Record<string, Building>;
  },
  view: SceneView,
  knownGrid?: Cell[][],
): Scene => {
  if (view.mode === 'world') {
    return { ...world, snapshots: [], fog: null };
  }

  const { viewer, knowledge } = view;
  const buildings = filterVisible(world.buildings, viewer, knowledge);
  const width = knowledge?.width ?? 0;
  const snapshots = Object.values(knowledge?.contacts ?? {}).filter(
    contact =>
      contact.kind === 'building' &&
      knowledge?.visible[contact.y * width + contact.x] !== 1,
  );

  return {
    grid: knownGrid ?? getKnownGrid(world.grid, knowledge),
    units: filterVisible(world.units, viewer, knowledge),
    buildings,
    snapshots,
    fog: knowledge ?? null,
  };
};
