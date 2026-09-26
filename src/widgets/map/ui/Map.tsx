import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { Position } from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { useSelectionStore } from '@features/selection';
import { useMovementStore } from '@features/pathfinding';
import { useCameraInput, useMapCellClick, useScene } from './utils';
import { CanvasLayers } from './CanvasLayers';
import { MapControls } from './MapControls';
import styles from './styles.module.css';

export const Map = () => {
  const viewport = useRef<HTMLDivElement>(null);
  const input = useCameraInput(viewport);
  const { scene, humanId } = useScene();
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
      useSelectionStore.getState().clearSelection();
      useMovementStore.getState().resetStore();
    }
    if (selection?.kind === 'building' && !scene.buildings[selection.id]) {
      useSelectionStore.getState().clearSelection();
      useMovementStore.getState().resetStore();
    }
  }, [scene, selection]);

  const onCellClick = ({ x, y }: Position) => handleCellClick(x, y);

  return (
    <>
      <div
        ref={viewport}
        className={styles.MapViewport}
        tabIndex={0}
        role='region'
        aria-label='Карта. Перетаскивайте средней или правой кнопкой мыши либо с зажатым пробелом, масштабируйте колесом, двигайте стрелками или WASD. Левый клик выбирает клетку или выполняет действие.'
        onContextMenu={event => event.preventDefault()}
        {...input}
      >
        <CanvasLayers
          scene={scene}
          humanId={humanId}
          onCellClick={onCellClick}
        />
      </div>

      <MapControls onFocusBase={base ? focusBase : undefined} />
    </>
  );
};
