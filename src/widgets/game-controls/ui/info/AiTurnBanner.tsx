import { useEffect, useRef } from 'react';
import { useGameLoopStore } from '@entities/games';
import styles from './AiTurnBanner.styles.module.css';

const MESSAGE = { ai: 'Ход противника', human: 'Ваш ход' };

/**
 * Сообщает о смене хода: ходит противник или снова игрок. Начало своего хода
 * дублирует звуковой сигнал, поэтому видно и без звука.
 *
 * Ход ИИ отрабатывает в текущей стадии мгновенно, поэтому баннер живёт на своей CSS-анимации:
 * подписка на стор перезапускает её при каждом переходе хода к ИИ, и смена
 * стороны не проходит незамеченной.
 */
export const AiTurnBanner = () => {
  const banner = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const turn = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const show = (state: ReturnType<typeof useGameLoopStore.getState>) => {
      const controller = state.participants.find(
        p => p.id === state.activePlayer,
      )?.controller;
      const element = banner.current;
      if (controller !== 'ai' && controller !== 'human') return;
      if (!element || state.phase !== 'inProgress') return;
      const kind = controller === 'ai' ? 'ai' : 'human';
      element.dataset.kind = kind;
      if (text.current) text.current.textContent = MESSAGE[kind];
      // Свой ход объявляется крупной лентой с номером хода.
      if (turn.current) turn.current.textContent = `Ход ${state.currentTurn}`;

      element.classList.remove(styles.Visible);
      // Форсируем reflow: иначе повторный ход не перезапустит анимацию.
      void element.offsetWidth;
      element.classList.add(styles.Visible);

      // Скринридер объявляет живую область по смене текста, а не класса,
      // поэтому текст появляется на время показа и снимается после.
      if (live.current) live.current.textContent = MESSAGE[kind];
    };
    // Начало или продолжение партии тоже объявляется.
    show(useGameLoopStore.getState());
    // Каждая смена хода на ИИ, включая переход от одного ИИ к другому,
    // и возврат хода человеку.
    return useGameLoopStore.subscribe((state, previous) => {
      if (state.activePlayer !== previous.activePlayer) show(state);
    });
  }, []);

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
        <span ref={turn} className={styles.TurnNumber} />
        <span ref={text} className={styles.Text}>
          {MESSAGE.ai}
        </span>
      </div>

      <span ref={live} className={styles.Live} role='status' />
    </div>
  );
};
