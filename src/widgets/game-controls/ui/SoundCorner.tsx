import { useEffect, useRef } from 'react';
import { SoundIcon } from '@shared/ui';
import { useAudioSettingsStore } from '@entities/settings';
import { AudioSettings } from './info';
import styles from './styles.module.css';

/**
 * Звук — значок в углу меню; ползунки во всплывающей панели. Клик мимо
 * панели или Esc её закрывают.
 */
export const SoundCorner = () => {
  const muted = useAudioSettingsStore(state => state.muted);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (event: Event) => {
      const details = ref.current;
      if (!details?.open) return;
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !details.contains(event.target as Node)
      ) {
        details.open = false;
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  return (
    <details ref={ref} className={styles.SoundCorner}>
      <summary aria-label='Звук'>
        <SoundIcon size={20} muted={muted} />
      </summary>
      <div className={styles.SoundPopup}>
        <AudioSettings />
      </div>
    </details>
  );
};
