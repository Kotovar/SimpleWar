import {
  useEffect,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { isTyping } from '@shared/lib';
import { useSettingsStore } from '@entities/settings';

/** Сдвиг камеры клавишей, в клетках. */
const KEY_PAN_CELLS = 3;

const KEY_PAN: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
  KeyW: [0, -1],
  KeyS: [0, 1],
};

type Drag = { x: number; y: number; pointerId: number };

/**
 * Управление камерой: размер окна, колесо с масштабом к курсору,
 * перетаскивание (средняя кнопка или Space + левая) и клавиши.
 * Левая кнопка без Space карту не двигает: дрогнувшая при выборе мышь
 * не сдвигает камеру. Перетаскивание гасит следующий клик, поэтому
 * выбранный юнит не получает приказ.
 *
 * @param viewport - Контейнер карты.
 * @returns Обработчики указателя для контейнера.
 */
export const useCameraInput = (viewport: RefObject<HTMLDivElement | null>) => {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const spaceHeld = useRef(false);
  const spaceUsed = useRef(false);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const { setViewport, zoomBy, panBy } = useSettingsStore.getState();

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewport(Math.floor(width), Math.floor(height));
    });
    resize.observe(element);

    // Колесо масштабирует карту, а не страницу: слушатель не пассивный.
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      const box = element.getBoundingClientRect();
      zoomBy(event.deltaY < 0 ? 1 : -1, {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (event.code === 'Space') {
        if (!spaceHeld.current) spaceUsed.current = false;
        spaceHeld.current = true;
        // Space на кнопке нажимает её; в остальных местах не листает страницу.
        if (!(event.target instanceof HTMLButtonElement))
          event.preventDefault();
        return;
      }
      const pan = KEY_PAN[event.code];
      if (pan) {
        event.preventDefault();
        const step = useSettingsStore.getState().cellSize * KEY_PAN_CELLS;
        panBy(pan[0] * step, pan[1] * step);
      } else if (event.key === '+' || event.key === '=') {
        zoomBy(1);
      } else if (event.key === '-' || event.key === '_') {
        zoomBy(-1);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      // Отпускание после жеста камеры не становится пропуском хода.
      if (spaceUsed.current || !spaceHeld.current) event.preventDefault();
      spaceHeld.current = false;
    };
    const onBlur = () => {
      spaceHeld.current = false;
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', onBlur);

    return () => {
      resize.disconnect();
      element.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('blur', onBlur);
    };
  }, [viewport]);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return {
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => {
      // После перетаскивания браузер всё равно посылает click: не выполняем действие.
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.stopPropagation();
      event.preventDefault();
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'mouse' || event.button > 1) return;
      suppressClick.current = false;
      // Обычный левый клик должен попасть в Canvas.
      if (event.button === 0 && !spaceHeld.current) return;
      if (spaceHeld.current) spaceUsed.current = true;
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
      };
      event.preventDefault();
      suppressClick.current = event.button === 0;
      startDrag(event);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      suppressClick.current = true;
      useSettingsStore
        .getState()
        .panBy(current.x - event.clientX, current.y - event.clientY);
      current.x = event.clientX;
      current.y = event.clientY;
    },
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
    onLostPointerCapture: finishDrag,
  };
};
