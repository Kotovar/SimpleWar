import { useUnitsStore } from '@entities/units';
import { useGameLoopStore, useParticipantStyles } from '@entities/games';
import { getAiPlayback, usePreferencesStore } from '@entities/settings';
import { useSandboxStore } from '@features/sandbox';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  AI_PLAYBACK_RATE,
  type Building,
  type Owner,
  type Position,
  type Unit,
} from '@shared/config';
import { audio, gameEvents } from '@shared/lib';
import { useResearchStore } from '@entities/researches';
import { canUnitStep } from '@features/pathfinding';
import {
  CHOP_DEPTH,
  CHOP_PART,
  CHOPS,
  CLEARING_DURATION,
  createPlan,
  diffScene,
  drawEffect,
  drawProjectile,
  advanceTracks,
  getAnimationFrame,
  getBusyTime,
  getCommandEffect,
  getHourglassFrames,
  getSpentIds,
  isInCombat,
  planSceneAnimations,
  renderEntitiesLayer,
  renderSnapshots,
  updateHourglasses,
  withClear,
  type AnimationTrack,
  type EffectLayer,
  type Hourglass,
  type ScenePlan,
  type StrikeShot,
  type Scene,
  type Tracked,
} from '@widgets/map/lib';
import { prefersReducedMotion } from './animatePulse';
import { setupCanvas } from './getCtx';
import { onMapEffect } from './mapSignals';
import type { MapView } from './useMapView';

/** Показанное время трека, мс анимации. */
const clock = (track: AnimationTrack) => track.clock ?? 0;

/** Кадр эффекта без движения для reduced motion: число стоит на месте. */
const STILL_PROGRESS = 0.15;

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
  const teams = useParticipantStyles();
  const aiTurn = useGameLoopStore(state =>
    state.participants.some(
      participant =>
        participant.id === state.activePlayer &&
        participant.controller === 'ai',
    ),
  );
  // Последний кадр мгновенного хода может прийти уже после возврата человеку.
  const previousAiTurn = useRef(aiTurn);
  const playback = usePreferencesStore(getAiPlayback);
  const sandboxFast = useSandboxStore(state => state.enabled && state.fast);
  // Очки есть, а шагнуть некуда (вокруг дорогой рельеф): считаем один раз
  // на смену юнитов, а не в каждом кадре анимации.
  const stuck = useMemo(
    () =>
      new Set(
        Object.values(worldUnits)
          .filter(
            unit =>
              unit.owner === humanId &&
              unit.movePoints > 0 &&
              !canUnitStep(unit),
          )
          .map(({ id }) => id),
      ),
    [humanId, worldUnits],
  );
  const tracked = useRef<ReadonlyMap<string, Tracked>>(new Map());
  const known = useRef<ReadonlySet<string>>(new Set());
  const strikeCells = useRef<ReadonlySet<string>>(new Set());
  /** Проигрываемые планы показа; время в них — мс от `t0` с ускорением ИИ. */
  const tracks = useRef<AnimationTrack[]>([]);
  /** Клетки, пройденные юнитами с прошлого сравнения: путь показа. */
  const trails = useRef(new Map<string, Position[]>());
  /** Видимые удары осады с прошлого сравнения; орудие — если видно. */
  const strikes = useRef<StrikeShot[]>([]);
  /** Объекты прошлого кадра: погибший стоит до попадания как был. */
  const lastEntities = useRef<Record<string, Unit | Building>>({});
  /** Песочные часы отходивших: пересыпание, затем переворот при новом ходе. */
  const hourglasses = useRef<ReadonlyMap<string, Hourglass>>(new Map());
  /** Чьи часы показаны: смена участника начинает историю заново. */
  const hourglassOwner = useRef<Owner | null | undefined>(undefined);
  /** Запускает перерисовку, если цикл анимации сейчас стоит. */
  const redraw = useRef<() => void>(() => {});
  const isFirstRun = useRef(true);
  /** Клетки гибели с прошлого сравнения: события приходят раньше рендера. */
  const deaths = useRef(new Map<string, Position>());

  /** Ставит план показа: мгновенные звуки — сразу, отложенные — в цикле кадров. */
  const play = (
    plan: ScenePlan,
    ai: boolean,
    t0 = performance.now(),
    bodies?: AnimationTrack['bodies'],
  ) => {
    plan.sounds = plan.sounds.filter(({ sfx, at }) => {
      if (at > 0) return true;
      audio.play(sfx);
      return false;
    });
    tracks.current.push({ plan, t0, ai, bodies });
    redraw.current();
  };

  useEffect(
    () =>
      gameEvents.subscribe(event => {
        if (event.type === 'GAME_RESET') {
          tracks.current = [];
          trails.current.clear();
          strikes.current = [];
        }
        if (event.type === 'SIEGE_STRIKE_EXECUTED') {
          // Видно орудие — камень летит от него; видна только клетка —
          // падает сверху, не выдавая орудия.
          const siege = useUnitsStore.getState().units[event.siegeId];
          const shooter = siege && isVisible(siege.x, siege.y) ? siege : null;
          // Цель видна смотрящему или это его же удар: иначе скрытая
          // наводка не раскрывается — видно только взмах орудия.
          const seen = isVisible(event.x, event.y) || event.owner === humanId;
          if (shooter || seen) {
            strikes.current.push({
              siegeId: shooter?.id,
              from: shooter ? { x: shooter.x, y: shooter.y } : undefined,
              to: seen ? { x: event.x, y: event.y } : undefined,
            });
          }
        }
        if (event.type === 'UNIT_PASSED') {
          // Транзит через своих не меняет стор: клетку пути даёт событие.
          const unit = useUnitsStore.getState().units[event.unitId];
          if (unit) {
            const trail = trails.current.get(unit.id) ?? [
              { x: unit.x, y: unit.y },
            ];
            trail.push({ x: event.x, y: event.y });
            trails.current.set(unit.id, trail);
          }
        }
        if (event.type === 'COMMAND_SUCCEEDED') {
          const effect = getCommandEffect(event.command, isVisible, 0);
          if (effect) {
            // Рабочий машет топором к дереву: удары совпадают с дрожью
            // дерева, падает оно в сторону от рабочего.
            const workerId = event.command.details?.workerId;
            const worker =
              typeof workerId === 'string' &&
              useUnitsStore.getState().units[workerId];
            const plan = createPlan({
              sounds: [
                { sfx: effect.clearing ? 'clearForest' : 'build', at: 0 },
              ],
            });
            if (worker && effect.clearing) {
              const dx = effect.x - worker.x;
              const dy = effect.y - worker.y;
              const length = Math.hypot(dx, dy) || 1;
              effect.fall = dx < 0 ? -1 : 1;
              plan.lunges.set(worker.id, {
                dx: (dx / length) * CHOP_DEPTH,
                dy: (dy / length) * CHOP_DEPTH,
                start: 0,
                duration: CLEARING_DURATION * CHOP_PART,
                pulses: CHOPS,
              });
            }
            plan.effects.push(effect);
            play(plan, aiTurn);
          }
        }
        const entity =
          event.type === 'UNIT_DESTROYED'
            ? event.unit
            : event.type === 'BUILDING_DESTROYED'
              ? event.building
              : null;
        if (entity) deaths.current.set(entity.id, { x: entity.x, y: entity.y });
      }),
    // play читает только refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aiTurn, humanId, isVisible],
  );

  // Ход идёт по клеткам через стор: записываем пройденный путь.
  useEffect(
    () =>
      useUnitsStore.subscribe((state, previous) => {
        for (const id in state.units) {
          const now = state.units[id];
          const before = previous.units[id];
          if (!before || (now.x === before.x && now.y === before.y)) continue;
          const trail = trails.current.get(id) ?? [
            { x: before.x, y: before.y },
          ];
          trail.push({ x: now.x, y: now.y });
          trails.current.set(id, trail);
        }
      }),
    [],
  );

  // Сбор анимаций при размонтировании не нужен: refs уходят с компонентом.

  const { buildings, units, snapshots, staffed } = scene;

  // Взведённые катапульты: свои с подготовленным ударом и чужие, чья
  // отметка удара видна, — иначе поза выдала бы скрытую наводку.
  const cocked = useMemo(() => {
    const marks = new Set(strikeMarks?.map(({ x, y }) => `${x},${y}`));
    return new Set(
      Object.values(units).flatMap(unit => {
        const aim = unit.role === 'military' ? unit.preparedStrike : null;
        if (!aim) return [];
        const known = unit.owner === humanId || marks.has(`${aim.x},${aim.y}`);
        return known ? [unit.id] : [];
      }),
    );
  }, [humanId, strikeMarks, units]);

  // Сравнение состава — только при изменении сцены, не при сдвиге камеры.
  useEffect(() => {
    const now = performance.now();
    const ai = aiTurn || previousAiTurn.current;

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

    const rate = sandboxFast ? 0 : AI_PLAYBACK_RATE[playback];
    advanceTracks(tracks.current, now, track => (track.ai ? rate || 1 : 1));
    const scene = { ...units, ...buildings };
    const plan = planSceneAnimations(diff.events, {
      instant: prefersReducedMotion() || (ai && rate === 0),
      entity: id => scene[id] ?? worldUnits[id],
      // Путь — до последней клетки, где юнит встал: транзит после неё
      // (не хватило очков выйти) не пройден.
      trail: id => {
        const trail = trails.current.get(id);
        const moved = scene[id];
        if (!trail || !moved) return undefined;
        const end = trail.findLastIndex(
          ({ x, y }) => x === moved.x && y === moved.y,
        );
        return end > 0 ? trail.slice(0, end + 1) : undefined;
      },
      busy: id =>
        getBusyTime(tracks.current, clock, id, track =>
          track.ai ? rate || 1 : 1,
        ) * (ai ? rate || 1 : 1),
      strikes: strikes.current,
    });
    // Погибший стоит до попадания как был, но на клетке гибели.
    const bodies = new Map(
      diff.events.flatMap(event => {
        const body =
          event.kind === 'death' &&
          plan.lingers.has(event.id) &&
          lastEntities.current[event.id];
        return body
          ? [[event.id, { ...body, x: event.x, y: event.y }] as const]
          : [];
      }),
    );
    play(plan, ai, now, bodies);
    trails.current.clear();
    strikes.current = [];
    lastEntities.current = scene;

    tracked.current = diff.tracked;
    strikeCells.current = visibleStrikes;
    deaths.current.clear();
    known.current = worldIds;
    isFirstRun.current = false;
    audio.setMusicState({
      combat: isInCombat(visibleUnits, visibleBuildings, humanId),
    });
  }, [
    aiTurn,
    buildings,
    humanId,
    isVisible,
    playback,
    sandboxFast,
    staffed,
    strikeMarks,
    units,
    worldIds,
    worldUnits,
  ]);

  useEffect(() => {
    previousAiTurn.current = aiTurn;
  }, [aiTurn]);

  // Отходившие: новые пересыпают песок, вернувшие очки переворачивают часы.
  // Перерисует эффект слоя ниже: он зависит от тех же данных.
  useEffect(() => {
    const now = performance.now();
    const spent = getSpentIds(
      buildings,
      units,
      humanId,
      Object.values(worldUnits),
      stuck,
    );
    const fresh = hourglassOwner.current !== humanId;
    hourglasses.current = updateHourglasses(
      fresh ? new Map() : hourglasses.current,
      spent,
      id => {
        const unit = units[id];
        // Здание перестаёт быть отходившим, только вернув очки.
        if (!unit) return buildings[id] ? true : null;
        return unit.movePoints === unit.maxMovePoints;
      },
      now,
      // При первом показе часы уже пересыпаны: ход потрачен до него.
      fresh,
    );
    hourglassOwner.current = humanId;
  }, [buildings, humanId, stuck, units, worldUnits]);

  // Внешний сигнал (отказ приказа) запускает перерисовку без смены сцены.
  useEffect(
    () =>
      onMapEffect(effect =>
        play(
          createPlan({ effects: [{ ...effect, start: 0 }] }),
          false,
          effect.start,
        ),
      ),
    // play читает только refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const rate = sandboxFast ? 0 : AI_PLAYBACK_RATE[playback];
      const skip = (ai?: boolean) => still || (ai && rate === 0);
      // Пропущенные треки ИИ завершаются насовсем: иначе после снятия
      // ускорения они доиграют с прежним HP и повторным попаданием.
      if (rate === 0) tracks.current = tracks.current.filter(({ ai }) => !ai);
      advanceTracks(tracks.current, time, track => (track.ai ? rate || 1 : 1));
      const animation = getAnimationFrame(
        tracks.current,
        clock,
        id => units[id] ?? buildings[id],
        track => !!skip(track.ai),
      );
      tracks.current = animation.tracks;
      animation.sounds.forEach(sfx => audio.play(sfx));
      const offsets = animation.offsets;
      // Погибшие до попадания стоят на клетке как были.
      const shownUnits = { ...units };
      const shownBuildings = { ...buildings };
      animation.bodies.forEach(body => {
        if ('maxMovePoints' in body) shownUnits[body.id] = body;
        else shownBuildings[body.id] = body;
      });

      // Без движения часы завершаются насовсем: иначе после отмены песок вернётся.
      if (still) {
        hourglasses.current = new Map(
          [...hourglasses.current]
            .filter(([, glass]) => glass.kind !== 'flip')
            .map(([id, glass]) => [id, { ...glass, start: -Infinity }]),
        );
      }
      const { frames: glasses, animating: pouring } = getHourglassFrames(
        hourglasses.current,
        time,
        still,
      );

      const drawEffects = (layer: EffectLayer) =>
        animation.effects.forEach(({ effect, progress, still }) =>
          drawEffect(
            ctx,
            effect,
            still ? STILL_PROGRESS : progress,
            cellSize,
            layer,
            teams,
          ),
        );

      withClear(ctx, () => {
        drawEffects('under');
        renderSnapshots(ctx, snapshots, cellSize, range, teams);
        renderEntitiesLayer(
          ctx,
          shownBuildings,
          shownUnits,
          cellSize,
          offsets,
          humanId,
          range,
          staffed,
          glasses,
          Object.values(worldUnits),
          cocked,
          teams,
        );
        drawEffects('over');
        animation.projectiles.forEach(({ shot, progress }) =>
          drawProjectile(
            ctx,
            shot.kind,
            shot.from,
            shot.to,
            progress,
            cellSize,
          ),
        );
      });

      const animating = tracks.current.length > 0 || pouring;
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
    cocked,
    humanId,
    ref,
    researched,
    snapshots,
    staffed,
    stuck,
    units,
    view,
    worldUnits,
    playback,
    sandboxFast,
    teams,
  ]);
};
