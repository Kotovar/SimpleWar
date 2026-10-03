import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  BUILDINGS_NAME,
  BUILDINGS_CONFIG,
  type Position,
} from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useSelectionStore } from '@features/selection';
import { build, getContextBuildings, giveBuildOrder } from '@features/build';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { GoldIcon, WoodIcon } from '@shared/ui';
import {
  assignWorker,
  getContextWorkplace,
  giveWorkOrder,
} from '@features/workers';
import { worldToScreen } from '@shared/lib';
import {
  advanceOrder,
  useHighlightStore,
  useMovementStore,
} from '@features/pathfinding';
import {
  useCameraInput,
  useGameHotkeys,
  useMapCellClick,
  useScene,
} from './utils';
import { CanvasLayers } from './CanvasLayers';
import { MapControls } from './MapControls';
import styles from './styles.module.css';

export const Map = () => {
  const [buildMenu, setBuildMenu] = useState<
    (Position & { workerId: string }) | null
  >(null);
  const camera = useSettingsStore(state => state.camera);
  const cellSize = useSettingsStore(state => state.cellSize);
  const mapSize = useSettingsStore(state => state.viewport);
  const activePlayer = useGameLoopStore(state => state.activePlayer);
  const viewport = useRef<HTMLDivElement>(null);
  const input = useCameraInput(viewport);
  const { scene, humanId, viewer } = useScene();
  const handleCellClick = useMapCellClick(scene);
  const isMeasured = useSettingsStore(state => state.viewport.width > 0);
  const centerOn = useSettingsStore(state => state.centerOn);
  const fitWorld = useSettingsStore(state => state.fitWorld);

  const base = Object.values(scene.buildings).find(
    building => building.owner === humanId && building.type === 'base',
  );
  const baseX = base?.x;
  const baseY = base?.y;
  const focusBase = useCallback(() => {
    if (baseX === undefined || baseY === undefined) fitWorld();
    else centerOn(baseX + 0.5, baseY + 0.5);
  }, [baseX, baseY, centerOn, fitWorld]);

  useGameHotkeys({ scene, humanId, focusBase });

  // Новая партия начинается с камеры у своей ратуши, как только окно измерено.
  const focused = useRef(false);
  useEffect(() => {
    if (!isMeasured || focused.current) return;
    focused.current = true;
    focusBase();
  }, [focusBase, isMeasured]);

  // Выбранный враг ушёл из обзора — выбор снимается до отрисовки панели.
  const selection = useSelectionStore(state => state.selection);
  useLayoutEffect(() => {
    if (selection?.kind === 'unit' && !scene.units[selection.id]) {
      const unit = useUnitsStore.getState().units[selection.id];
      // Своего рабочего внутри здания можно выбрать через его панель,
      // хотя на карте он не рисуется. Погибший юнит всегда теряет выбор.
      if (!unit || (viewer !== 'world' && unit.owner !== viewer)) {
        useSelectionStore.getState().clearSelection();
        useMovementStore.getState().resetStore();
      }
    }
    if (selection?.kind === 'building' && !scene.buildings[selection.id]) {
      useSelectionStore.getState().clearSelection();
      useMovementStore.getState().resetStore();
    }
  }, [scene, selection, viewer]);

  const selectedUnitId = selection?.kind === 'unit' ? selection.id : null;
  useEffect(() => {
    setBuildMenu(null);
  }, [selectedUnitId, activePlayer]);

  const menuWorker =
    buildMenu &&
    selection?.kind === 'unit' &&
    selection.id === buildMenu.workerId
      ? useUnitsStore.getState().units[buildMenu.workerId]
      : null;
  const menuOptions =
    menuWorker && humanId && !getTurnRejection(humanId)
      ? getContextBuildings(menuWorker, humanId, buildMenu!)
      : [];
  const menuWorkplace =
    menuWorker && humanId && buildMenu && !getTurnRejection(humanId)
      ? getContextWorkplace(menuWorker, humanId, buildMenu)
      : null;
  const finishOrder = (workerId: string) => {
    if (!humanId) return;
    const stopped = advanceOrder(humanId, workerId, unit =>
      unit.order.type === 'work'
        ? assignWorker({
            actor: humanId,
            workerId: unit.id,
            buildingId: unit.order.buildingId,
          })
        : build({ actor: humanId, workerId: unit.id, ...unit.order }),
    );
    setBuildMenu(null);
    useSelectionStore.getState().clearSelection();
    useMovementStore.getState().resetStore();
    useHighlightStore.getState().resetStore();
    if (stopped) {
      useSelectionStore.getState().selectUnit(workerId);
      useMovementStore.getState().calculateActionHighlights(workerId);
    }
    viewport.current?.focus();
  };
  const menuPoint =
    buildMenu &&
    worldToScreen(camera, cellSize, { x: buildMenu.x + 0.5, y: buildMenu.y });
  const onCellClick = ({ x, y }: Position, order = false) => {
    setBuildMenu(null);
    const unit =
      selection?.kind === 'unit'
        ? useUnitsStore.getState().units[selection.id]
        : null;
    if (
      order &&
      unit &&
      humanId &&
      !getTurnRejection(humanId) &&
      (getContextBuildings(unit, humanId, { x, y }).length ||
        getContextWorkplace(unit, humanId, { x, y }))
    ) {
      setBuildMenu({ workerId: unit.id, x, y });
      return;
    }
    handleCellClick(x, y, order);
  };

  return (
    <>
      <div
        ref={viewport}
        className={styles.MapViewport}
        tabIndex={0}
        role='region'
        aria-label='Карта. Перетаскивайте средней кнопкой мыши либо с зажатым пробелом, масштабируйте колесом, двигайте стрелками или WASD. Левый клик выбирает объект или подтверждает режим. Правый клик приказывает идти, атаковать или лечить; рабочим по ресурсу открывает стройку.'
        onKeyDownCapture={event => {
          if (event.key === 'Escape' && buildMenu) {
            event.stopPropagation();
            setBuildMenu(null);
          }
        }}
        onContextMenu={event => event.preventDefault()}
        {...input}
      >
        <CanvasLayers
          scene={scene}
          humanId={humanId}
          onCellClick={onCellClick}
        />
        {buildMenu &&
          menuWorker &&
          (menuOptions.length > 0 || menuWorkplace) &&
          menuPoint &&
          humanId && (
            <div
              className={styles.BuildMenu}
              role='group'
              aria-label='Контекстная стройка'
              style={{
                left: Math.max(4, Math.min(menuPoint.x, mapSize.width - 240)),
                top: Math.max(4, Math.min(menuPoint.y, mapSize.height - 280)),
              }}
              onPointerDown={event => event.stopPropagation()}
              onKeyDown={event => event.stopPropagation()}
            >
              <strong>
                {menuWorkplace
                  ? BUILDINGS_NAME[menuWorkplace.type]
                  : `Построить (${buildMenu.x + 1}, ${buildMenu.y + 1})`}
              </strong>
              {menuOptions.map(buildingType => (
                <button
                  key={buildingType}
                  type='button'
                  aria-label={`${BUILDINGS_NAME[buildingType]}: ${BUILDINGS_CONFIG[buildingType].cost.gold} золота, ${BUILDINGS_CONFIG[buildingType].cost.wood} древесины`}
                  onClick={() => {
                    const result = giveBuildOrder({
                      actor: humanId,
                      workerId: buildMenu.workerId,
                      buildingType,
                      x: buildMenu.x,
                      y: buildMenu.y,
                    });
                    if (!result.ok) return;
                    finishOrder(buildMenu.workerId);
                  }}
                >
                  <span>{BUILDINGS_NAME[buildingType]}</span>
                  <span className={styles.ContextCost}>
                    <span
                      aria-label={`${BUILDINGS_CONFIG[buildingType].cost.gold} золота`}
                      title='Золото'
                    >
                      <GoldIcon />
                      {BUILDINGS_CONFIG[buildingType].cost.gold}
                    </span>
                    <span
                      aria-label={`${BUILDINGS_CONFIG[buildingType].cost.wood} древесины`}
                      title='Древесина'
                    >
                      <WoodIcon />
                      {BUILDINGS_CONFIG[buildingType].cost.wood}
                    </span>
                  </span>
                </button>
              ))}
              {menuWorkplace && (
                <button
                  type='button'
                  onClick={() => {
                    const result = giveWorkOrder({
                      actor: humanId,
                      workerId: buildMenu.workerId,
                      buildingId: menuWorkplace.id,
                    });
                    if (result.ok) finishOrder(buildMenu.workerId);
                  }}
                >
                  Работать
                </button>
              )}
              <button
                type='button'
                onClick={() => {
                  setBuildMenu(null);
                  viewport.current?.focus();
                }}
              >
                Отмена
              </button>
            </div>
          )}
      </div>

      <MapControls onFocusBase={base ? focusBase : undefined} />
    </>
  );
};
