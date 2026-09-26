import { useEffect, useRef, type RefObject } from 'react';
import type { Owner } from '@shared/config';
import {
  drawEffect,
  EFFECT_DURATION,
  renderEntitiesLayer,
  renderSnapshots,
  withClear,
  type CellOffsets,
  type Effect,
  type EffectLayer,
  type Scene,
} from '@widgets/map/lib';
import { setupCanvas } from './getCtx';
import type { MapView } from './useMapView';

const MOVE_DURATION = 220;
const SPAWN_DURATION = 420;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

// Небольшой перелёт за 1 и возврат: модель «выпрыгивает» на клетку.
const easeOutBack = (t: number) => 1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2;

type Tracked = { x: number; y: number; hp: number };

type Props = {
  ref: RefObject<HTMLCanvasElement | null>;
  scene: Scene;
  /**
   * ID всех объектов мира. Нужны только чтобы отличить гибель от ухода
   * из обзора и найм от появления в обзоре; сами объекты не рисуются.
   */
  worldIds: ReadonlySet<string>;
  /** Видна ли клетка смотрящему: эффекты только в доступной зоне. */
  isVisible: (x: number, y: number) => boolean;
  humanId: Owner | null;
  view: MapView;
};

/**
 * Рисует слой объектов сцены и оживляет его изменения.
 *
 * Сравнивает сцену с предыдущим кадром: сдвиг клетки превращается в плавный
 * переезд, потеря HP — во вспышку с уроном, гибель — в эффект гибели.
 * Объект, ушедший в туман или вышедший из него, просто исчезает или
 * появляется: по анимации нельзя узнать о скрытых событиях.
 *
 * @param props.ref - Холст объектов.
 * @param props.scene - Разрешённые для рисования объекты и снимки.
 * @param props.worldIds - ID объектов мира для различения гибели и ухода.
 * @param props.isVisible - Проверка видимости клетки.
 * @param props.humanId - Участник, которым управляет интерфейс.
 * @param props.view - Камера карты.
 */
export const useEntitiesLayer = ({
  ref,
  scene,
  worldIds,
  isVisible,
  humanId,
  view,
}: Props) => {
  const tracked = useRef(new Map<string, Tracked>());
  const known = useRef<ReadonlySet<string>>(new Set());
  const moves = useRef(
    new Map<string, { fromX: number; fromY: number; start: number }>(),
  );
  const spawns = useRef(new Map<string, number>());
  const effects = useRef<Effect[]>([]);
  const frame = useRef(0);
  const isFirstRun = useRef(true);

  const { buildings, units, snapshots } = scene;

  // Сравнение состава — только при изменении сцены, не при сдвиге камеры.
  useEffect(() => {
    const now = performance.now();
    const alive = new Set<string>();

    [...Object.values(buildings), ...Object.values(units)].forEach(entity => {
      alive.add(entity.id);
      const before = tracked.current.get(entity.id);
      tracked.current.set(entity.id, {
        x: entity.x,
        y: entity.y,
        hp: entity.hp,
      });

      if (!before) {
        // Эффект найма — только для действительно нового объекта мира.
        if (!isFirstRun.current && !known.current.has(entity.id)) {
          spawns.current.set(entity.id, now);
          effects.current.push({
            x: entity.x,
            y: entity.y,
            spawn: entity.owner,
            start: now,
          });
        }
        return;
      }

      if (before.x !== entity.x || before.y !== entity.y) {
        moves.current.set(entity.id, {
          fromX: before.x,
          fromY: before.y,
          start: now,
        });
      }

      if (entity.hp < before.hp) {
        effects.current.push({
          x: entity.x,
          y: entity.y,
          damage: before.hp - entity.hp,
          start: now,
        });
      }
    });

    tracked.current.forEach((before, id) => {
      if (alive.has(id)) return;

      tracked.current.delete(id);
      moves.current.delete(id);
      spawns.current.delete(id);
      // Ушёл в туман — не гибель; гибель показываем только в обзоре.
      if (worldIds.has(id) || !isVisible(before.x, before.y)) return;
      effects.current.push({
        x: before.x,
        y: before.y,
        damage: before.hp,
        lethal: true,
        start: now,
      });
    });

    known.current = worldIds;
    isFirstRun.current = false;
  }, [buildings, isVisible, units, worldIds]);

  useEffect(() => {
    const { cellSize, viewport, offset, range } = view;
    const ctx = setupCanvas(ref, viewport.width, viewport.height, offset);
    if (!ctx) return;

    const draw = () => {
      const time = performance.now();
      const offsets: CellOffsets = new Map();

      moves.current.forEach((move, id) => {
        const entity = units[id] ?? buildings[id];
        const progress = Math.min(1, (time - move.start) / MOVE_DURATION);

        if (!entity || progress >= 1) {
          moves.current.delete(id);
          return;
        }

        const rest = 1 - easeOut(progress);
        offsets.set(id, {
          dx: (move.fromX - entity.x) * rest,
          dy: (move.fromY - entity.y) * rest,
        });
      });

      spawns.current.forEach((start, id) => {
        const progress = Math.min(1, (time - start) / SPAWN_DURATION);
        if (progress >= 1) {
          spawns.current.delete(id);
          return;
        }

        // Появление с пружинкой: здание или юнит «выпрыгивает» на клетке.
        const current = offsets.get(id) ?? { dx: 0, dy: 0 };
        offsets.set(id, {
          ...current,
          scale: 0.3 + easeOutBack(progress) * 0.7,
        });
      });

      effects.current = effects.current.filter(
        effect => time - effect.start < EFFECT_DURATION,
      );

      const drawEffects = (layer: EffectLayer) =>
        effects.current.forEach(effect =>
          drawEffect(
            ctx,
            effect,
            (time - effect.start) / EFFECT_DURATION,
            cellSize,
            layer,
          ),
        );

      withClear(ctx, () => {
        drawEffects('under');
        renderSnapshots(ctx, snapshots, cellSize, range);
        renderEntitiesLayer(
          ctx,
          buildings,
          units,
          cellSize,
          offsets,
          humanId,
          range,
        );
        drawEffects('over');
      });

      if (
        moves.current.size > 0 ||
        spawns.current.size > 0 ||
        effects.current.length > 0
      ) {
        frame.current = requestAnimationFrame(draw);
      }
    };

    cancelAnimationFrame(frame.current);
    draw();

    return () => cancelAnimationFrame(frame.current);
  }, [buildings, humanId, ref, snapshots, units, view]);
};
