import { useEffect, useRef } from 'react';
import { useGameLoopStore } from '@features/game-loop';
import styles from './AiTurnBanner.styles.module.css';

const MESSAGE = 'Ход противника';

/**
 * Сообщает, что сейчас ходит противник.
 *
 * Ход ИИ отрабатывает в текущей стадии мгновенно, поэтому баннер живёт на своей CSS-анимации:
 * подписка на стор перезапускает её при каждом переходе хода к ИИ, и смена
 * стороны не проходит незамеченной.
 */
export const AiTurnBanner = () => {
  const banner = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      useGameLoopStore.subscribe((state, previous) => {
        if (state.activePlayer !== 'ai' || previous.activePlayer === 'ai') {
          return;
        }

        const element = banner.current;
        if (!element || state.phase !== 'inProgress') return;

        element.classList.remove(styles.Visible);
        // Форсируем reflow: иначе повторный ход не перезапустит анимацию.
        void element.offsetWidth;
        element.classList.add(styles.Visible);

        // Скринридер объявляет живую область по смене текста, а не класса,
        // поэтому текст появляется на время показа и снимается после.
        if (live.current) live.current.textContent = MESSAGE;
      }),
    [],
  );

  return (
    <div className={styles.Overlay}>
      <div
        ref={banner}
        className={styles.Banner}
        aria-hidden
        onAnimationEnd={() => {
          if (live.current) live.current.textContent = '';
        }}
      >
        <span className={styles.Spinner} />
        {MESSAGE}
      </div>

      <span ref={live} className={styles.Live} role='status' />
    </div>
  );
};
