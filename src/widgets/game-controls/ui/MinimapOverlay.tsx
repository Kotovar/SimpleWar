import type { ReactNode } from 'react';
import { usePreferencesStore, type MinimapMode } from '@entities/settings';
import styles from './Overlays.styles.module.css';

const NEXT: Record<MinimapMode, MinimapMode> = {
  solid: 'translucent',
  translucent: 'hidden',
  hidden: 'solid',
};

const LABEL: Record<MinimapMode, string> = {
  solid: 'Мини-карта: непрозрачная',
  translucent: 'Мини-карта: полупрозрачная',
  hidden: 'Мини-карта скрыта',
};

/**
 * Мини-карта поверх карты вверху справа. Кнопка переключает её по кругу:
 * непрозрачная → полупрозрачная → скрыта; выбор сохраняется в браузере.
 */
export const MinimapOverlay = ({ children }: { children: ReactNode }) => {
  const mode = usePreferencesStore(state => state.minimapMode);
  const setMode = usePreferencesStore(state => state.setMinimapMode);

  return (
    <div className={styles.Minimap} data-mode={mode}>
      <button
        type='button'
        className={styles.MinimapToggle}
        title={`${LABEL[mode]}. Клик — ${LABEL[NEXT[mode]].toLowerCase()}`}
        aria-label={LABEL[mode]}
        onClick={() => setMode(NEXT[mode])}
      >
        {mode === 'hidden' ? '▣' : mode === 'translucent' ? '◫' : '■'}
      </button>
      {mode !== 'hidden' && children}
    </div>
  );
};
