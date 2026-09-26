import { CELL_SIZE } from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import styles from './styles.module.css';

type Props = {
  /** Переносит камеру к своей ратуше; без неё кнопки нет. */
  onFocusBase?: () => void;
};

/** Кнопки камеры поверх карты: масштаб, вся карта, к базе. */
export const MapControls = ({ onFocusBase }: Props) => {
  const cellSize = useSettingsStore(state => state.cellSize);
  const zoomBy = useSettingsStore(state => state.zoomBy);
  const resetZoom = useSettingsStore(state => state.resetZoom);
  const fitWorld = useSettingsStore(state => state.fitWorld);

  return (
    <div className={styles.MapControls} role='toolbar' aria-label='Камера'>
      <button
        type='button'
        onClick={() => zoomBy(-1)}
        title='Отдалить (−)'
        aria-label='Отдалить'
      >
        −
      </button>
      <button
        type='button'
        className={styles.ZoomValue}
        onClick={resetZoom}
        title='Вернуть масштаб 100%'
      >
        {Math.round((cellSize / CELL_SIZE) * 100)}%
      </button>
      <button
        type='button'
        onClick={() => zoomBy(1)}
        title='Приблизить (+)'
        aria-label='Приблизить'
      >
        +
      </button>
      <button type='button' onClick={fitWorld} title='Показать всю карту'>
        Вся карта
      </button>
      {onFocusBase && (
        <button type='button' onClick={onFocusBase} title='Камера к ратуше'>
          К базе
        </button>
      )}
    </div>
  );
};
