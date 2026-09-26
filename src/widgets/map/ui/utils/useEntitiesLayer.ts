import { useEffect, useRef, type RefObject } from 'react';
import type { Building, Owner, Unit } from '@shared/config';
import {
  drawEffect,
  EFFECT_DURATION,
  renderEntitiesLayer,
  withClear,
  type CellOffsets,
  type Effect,
  type EffectLayer,
} from '@widgets/map/lib';
import { setupCanvas } from './getCtx';
import { useDevicePixelRatio } from './useDevicePixelRatio';

const MOVE_DURATION = 220;
const SPAWN_DURATION = 420;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

// Небольшой перелёт за 1 и возврат: модель «выпрыгивает» на клетку.
const easeOutBack = (t: number) => 1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2;

type Tracked = { x: number; y: number; hp: number };

type Props = {
  ref: RefObject<HTMLCanvasElement | null>;
  buildings: Record<string, Building>;
  units: Record<string, Unit>;
  cellSize: number;
  humanId: Owner | null;
  width: number;
  height: number;
};

/**
 * Рисует слой сущностей и оживляет его изменения состояния.
 *
 * Сравнивает новое состояние сторов с предыдущим кадром: сдвиг клетки
 * превращается в плавный переезд, потеря HP — во вспышку с числом урона,
 * исчезновение сущности — в эффект гибели. Механику это не меняет:
 * сторы уже обновлены, анимируется только картинка.
 *
 * @param props.ref - Холст сущностей.
 * @param props.buildings - Текущее состояние зданий.
 * @param props.units - Текущее состояние юнитов.
 * @param props.cellSize - Размер клетки в пикселях.
 * @param props.humanId - Участник, которым управляет интерфейс.
 * @param props.width - Ширина холста в CSS-пикселях.
 * @param props.height - Высота холста в CSS-пикселях.
 */
export const useEntitiesLayer = ({
  ref,
  buildings,
  units,
  cellSize,
  humanId,
  width,
  height,
}: Props) => {
  const tracked = useRef(new Map<string, Tracked>());
  const moves = useRef(
    new Map<string, { fromX: number; fromY: number; start: number }>(),
  );
  const spawns = useRef(new Map<string, number>());
  const pixelRatio = useDevicePixelRatio();
  const effects = useRef<Effect[]>([]);
  const frame = useRef(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const ctx = setupCanvas(ref, width, height);
    if (!ctx) return;

    const now = performance.now();
    const alive = new Set<string>();

    // Снимок остаётся в ref между обновлениями сторов и сменами размера холста.
    [...Object.values(buildings), ...Object.values(units)].forEach(entity => {
      alive.add(entity.id);
      const before = tracked.current.get(entity.id);
      tracked.current.set(entity.id, {
        x: entity.x,
        y: entity.y,
        hp: entity.hp,
      });

      // Первый кадр партии только запоминает состав: анимировать нечего.
      if (!before) {
        if (!isFirstRun.current) {
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
      effects.current.push({
        x: before.x,
        y: before.y,
        damage: before.hp,
        lethal: true,
        start: now,
      });
    });

    isFirstRun.current = false;

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
        renderEntitiesLayer(ctx, buildings, units, cellSize, offsets, humanId);
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
  }, [buildings, cellSize, humanId, height, pixelRatio, ref, units, width]);
};
