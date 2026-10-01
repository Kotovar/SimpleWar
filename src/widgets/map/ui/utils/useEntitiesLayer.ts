import { useUnitsStore } from '@entities/units';
import { useEffect, useRef, type RefObject } from 'react';
import type { Owner, Position } from '@shared/config';
import { audio, gameEvents } from '@shared/lib';
import { useResearchStore } from '@entities/researches';
import {
  diffScene,
  drawEffect,
  EFFECT_DURATION,
  getEventEffect,
  getEventSfx,
  isInCombat,
  renderEntitiesLayer,
  renderSnapshots,
  withClear,
  type CellOffsets,
  type Effect,
  type EffectLayer,
  type Scene,
  type Tracked,
} from '@widgets/map/lib';
import { prefersReducedMotion } from './animatePulse';
import { setupCanvas } from './getCtx';
import { onMapEffect } from './mapSignals';
import type { MapView } from './useMapView';

const MOVE_DURATION = 220;
const SPAWN_DURATION = 420;
const LUNGE_DURATION = 260;
/** Выпад к цели в долях клетки. */
const LUNGE_DEPTH = 0.28;
/** Кадр эффекта без движения для reduced motion: число стоит на месте. */
const STILL_PROGRESS = 0.15;

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

// Небольшой перелёт за 1 и возврат: модель «выпрыгивает» на клетку.
const easeOutBack = (t: number) => 1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2;

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
  /** Видимые отметки удара осады: попадание по ним звучит как удар осады. */
  strikeMarks?: readonly Position[];
};

/**
 * Рисует слой объектов сцены, оживляет и озвучивает его изменения.
 *
 * Изменения берутся из {@link diffScene}: только видимое смотрящему, поэтому
 * ни эффект, ни звук не выдают скрытых событий. Анимация — лишь вид:
 * команды уже применены, её длительность и reduced motion ни на что не влияют.
 *
 * @param props.ref - Холст объектов.
 * @param props.scene - Разрешённые для рисования объекты и снимки.
 * @param props.worldIds - ID объектов мира для различения гибели и ухода.
 * @param props.isVisible - Проверка видимости клетки.
 * @param props.humanId - Участник, которым управляет интерфейс.
 * @param props.view - Камера карты.
 * @param props.strikeMarks - Видимые отметки удара осады.
 */
export const useEntitiesLayer = ({
  ref,
  scene,
  worldIds,
  isVisible,
  humanId,
  view,
  strikeMarks,
}: Props) => {
  const worldUnits = useUnitsStore(state => state.units);
  const tracked = useRef<ReadonlyMap<string, Tracked>>(new Map());
  const known = useRef<ReadonlySet<string>>(new Set());
  const strikeCells = useRef<ReadonlySet<string>>(new Set());
  const moves = useRef(
    new Map<string, { fromX: number; fromY: number; start: number }>(),
  );
  const lunges = useRef(
    new Map<string, { dx: number; dy: number; start: number }>(),
  );
  const spawns = useRef(new Map<string, number>());
  const effects = useRef<Effect[]>([]);
  /** Запускает перерисовку, если цикл анимации сейчас стоит. */
  const redraw = useRef<() => void>(() => {});
  const isFirstRun = useRef(true);
  /** Клетки гибели с прошлого сравнения: события приходят раньше рендера. */
  const deaths = useRef(new Map<string, Position>());

  useEffect(
    () =>
      gameEvents.subscribe(event => {
        const entity =
          event.type === 'UNIT_DESTROYED'
            ? event.unit
            : event.type === 'BUILDING_DESTROYED'
              ? event.building
              : null;
        if (entity) deaths.current.set(entity.id, { x: entity.x, y: entity.y });
      }),
    [],
  );

  const { buildings, units, snapshots, staffed } = scene;

  // Сравнение состава — только при изменении сцены, не при сдвиге камеры.
  useEffect(() => {
    const now = performance.now();

    // Рабочие в своих зданиях не рисуются, но лечение им тоже доступно.
    const sheltered = Object.values(worldUnits).filter(
      unit =>
        !units[unit.id] &&
        unit.role === 'civil' &&
        unit.workplaceId &&
        staffed.has(unit.workplaceId),
    );
    const visibleStrikes = new Set(strikeMarks?.map(({ x, y }) => `${x},${y}`));
    const visibleUnits = Object.values(units);
    const visibleBuildings = Object.values(buildings);
    const diff = diffScene(
      tracked.current,
      [...visibleBuildings, ...visibleUnits, ...sheltered],
      {
        firstRun: isFirstRun.current,
        knownIds: known.current,
        worldIds,
        isVisible,
        humanId,
        strikeCells: strikeCells.current,
        visibleStrikes,
        deathCell: id => deaths.current.get(id),
      },
    );

    diff.events.forEach(event => {
      audio.play(getEventSfx(event));
      const effect = getEventEffect(event, now);
      if (effect) effects.current.push(effect);
      if (event.kind === 'move') {
        moves.current.set(event.id, { ...event, start: now });
      }
      if (event.kind === 'spawn') spawns.current.set(event.id, now);
      const attacker =
        event.kind === 'attack' && (units[event.id] ?? buildings[event.id]);
      if (attacker && event.kind === 'attack' && event.target) {
        const dx = event.target.x - attacker.x;
        const dy = event.target.y - attacker.y;
        const length = Math.hypot(dx, dy) || 1;
        lunges.current.set(event.id, {
          dx: (dx / length) * LUNGE_DEPTH,
          dy: (dy / length) * LUNGE_DEPTH,
          start: now,
        });
      }
    });

    tracked.current = diff.tracked;
    strikeCells.current = visibleStrikes;
    deaths.current.clear();
    known.current = worldIds;
    isFirstRun.current = false;
    audio.setMusicState({
      combat: isInCombat(visibleUnits, visibleBuildings, humanId),
    });
  }, [
    buildings,
    humanId,
    isVisible,
    staffed,
    strikeMarks,
    units,
    worldIds,
    worldUnits,
  ]);

  // Внешний сигнал (отказ приказа) запускает перерисовку без смены сцены.
  useEffect(
    () =>
      onMapEffect(effect => {
        effects.current.push(effect);
        redraw.current();
      }),
    [],
  );

  // Завершённое исследование меняет значки (Строй) без смены юнитов.
  const researched = useResearchStore(state => state.completed);

  useEffect(() => {
    const { cellSize, viewport, offset, range } = view;
    const ctx = setupCanvas(ref, viewport.width, viewport.height, offset);
    if (!ctx) return;

    let frame = 0;
    const draw = () => {
      const time = performance.now();
      const still = prefersReducedMotion();
      const offsets: CellOffsets = new Map();

      moves.current.forEach((move, id) => {
        const entity = units[id] ?? buildings[id];
        const progress = Math.min(1, (time - move.start) / MOVE_DURATION);

        if (!entity || progress >= 1 || still) {
          moves.current.delete(id);
          return;
        }

        const rest = 1 - easeOut(progress);
        offsets.set(id, {
          dx: (move.fromX - entity.x) * rest,
          dy: (move.fromY - entity.y) * rest,
        });
      });

      lunges.current.forEach((lunge, id) => {
        const progress = (time - lunge.start) / LUNGE_DURATION;
        if (progress >= 1 || still || offsets.has(id)) {
          lunges.current.delete(id);
          return;
        }
        // Быстрый выпад к цели и возврат.
        const reach = Math.sin(progress * Math.PI);
        offsets.set(id, { dx: lunge.dx * reach, dy: lunge.dy * reach });
      });

      spawns.current.forEach((start, id) => {
        const progress = Math.min(1, (time - start) / SPAWN_DURATION);
        if (progress >= 1 || still) {
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
            still ? STILL_PROGRESS : (time - effect.start) / EFFECT_DURATION,
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
          staffed,
          Object.values(worldUnits),
        );
        drawEffects('over');
      });

      const animating =
        moves.current.size > 0 ||
        lunges.current.size > 0 ||
        spawns.current.size > 0 ||
        effects.current.length > 0;
      frame = 0;
      if (animating) frame = requestAnimationFrame(draw);
    };

    redraw.current = () => {
      if (!frame) draw();
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      redraw.current = () => {};
    };
  }, [
    buildings,
    humanId,
    ref,
    researched,
    snapshots,
    staffed,
    units,
    view,
    worldUnits,
  ]);
};
