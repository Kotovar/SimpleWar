import { useEffect, useRef, type RefObject } from 'react';
import type { Building, Unit } from '@shared/config';
import {
  drawEffect,
  EFFECT_DURATION,
  renderEntitiesLayer,
  withClear,
  type CellOffsets,
  type Effect,
} from '@widgets/map/lib';
import { setupCanvas } from './getCtx';

const MOVE_DURATION = 220;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

type Tracked = { x: number; y: number; hp: number };

type Props = {
  ref: RefObject<HTMLCanvasElement | null>;
  buildings: Record<string, Building>;
  units: Record<string, Unit>;
  cellSize: number;
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
 */
export const useEntitiesLayer = ({
  ref,
  buildings,
  units,
  cellSize,
  width,
  height,
}: Props) => {
  const tracked = useRef(new Map<string, Tracked>());
  const moves = useRef(
    new Map<string, { fromX: number; fromY: number; start: number }>(),
  );
  const effects = useRef<Effect[]>([]);
  const frame = useRef(0);

  useEffect(() => {
    const ctx = setupCanvas(ref, width, height);
    if (!ctx) return;

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

      if (!before) return;

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

      effects.current.push({
        x: before.x,
        y: before.y,
        damage: before.hp,
        lethal: true,
        start: now,
      });
    });

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

      effects.current = effects.current.filter(
        effect => time - effect.start < EFFECT_DURATION,
      );

      withClear(ctx, () => {
        renderEntitiesLayer(ctx, buildings, units, cellSize, offsets);
        effects.current.forEach(effect =>
          drawEffect(
            ctx,
            effect,
            (time - effect.start) / EFFECT_DURATION,
            cellSize,
          ),
        );
      });

      if (moves.current.size > 0 || effects.current.length > 0) {
        frame.current = requestAnimationFrame(draw);
      }
    };

    cancelAnimationFrame(frame.current);
    draw();

    return () => cancelAnimationFrame(frame.current);
  }, [buildings, cellSize, height, ref, units, width]);
};
