import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { Position } from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { useSelectionStore } from '@features/selection';
import { getContextBuildings } from '@features/build';
import { getTurnRejection, useGameLoopStore } from '@entities/games';
import { getContextWorkplace } from '@features/workers';
import { useMovementStore } from '@features/pathfinding';
import {
  useCameraInput,
  useGameHotkeys,
  useMapCellClick,
  useScene,
} from './utils';
import { CanvasLayers } from './CanvasLayers';
import { MapControls } from './MapControls';
import { ContextBuildMenu } from './ContextBuildMenu';
import styles from './styles.module.css';

export const Map = () => {
  const [buildMenu, setBuildMenu] = useState<
    (Position & { workerId: string }) | null
  >(null);
  const activePlayer = useGameLoopStore(state => state.activePlayer);
  const phase = useGameLoopStore(state => state.phase);
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
    if (phase === 'gameOver') fitWorld();
    else focusBase();
  }, [fitWorld, focusBase, isMeasured, phase]);

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
        aria-label={
          phase === 'gameOver'
            ? 'Обзор завершённой партии. Левый клик — сведения об объекте. Перетаскивайте средней кнопкой мыши либо с зажатым пробелом, масштабируйте колесом, двигайте стрелками или WASD.'
            : 'Карта. Перетаскивайте средней кнопкой мыши либо с зажатым пробелом, масштабируйте колесом, двигайте стрелками или WASD. Левый клик выбирает объект или подтверждает режим. Правый клик приказывает идти, атаковать или лечить; рабочим по ресурсу открывает стройку.'
        }
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
        {buildMenu && (
          <ContextBuildMenu
            target={buildMenu}
            humanId={humanId}
            onClose={() => setBuildMenu(null)}
            onFocus={() => viewport.current?.focus()}
          />
        )}
      </div>

      <MapControls onFocusBase={base ? focusBase : undefined} />
    </>
  );
};
