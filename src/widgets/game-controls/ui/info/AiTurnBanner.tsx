import { useEffect, useRef, useState } from 'react';
import { getParticipantGenitive } from '@shared/config';
import { isHostile } from '@shared/lib';
import { useGameLoopStore } from '@entities/games';
import { getAiPlayback, usePreferencesStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { isEnemyTurn } from '../../lib/enemyTurn';
import { SideMark } from './SideMark';
import styles from './AiTurnBanner.styles.module.css';

const MESSAGE = { ai: 'Ход противника', human: 'Ваш ход' };

/**
 * Один индикатор на всю очередь врагов: маркер и «Ход Жёлтых». От ИИ к ИИ
 * меняется только сторона, общее время не сбрасывается; скрывается при
 * возврате хода человеку или конце партии.
 */
const EnemyTurn = () => {
  const { activePlayer, participants, humanId } = useGameLoopSelectors();
  const active = useGameLoopStore(isEnemyTurn);
  const instant = usePreferencesStore(
    state => getAiPlayback(state) === 'instant',
  );
  const rush = usePreferencesStore(state => state.setAiRush);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => {
      clearInterval(timer);
      setElapsed(0);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className={styles.Enemy}>
      <span className={styles.Spinner} />
      <SideMark owner={activePlayer} participants={participants} />
      <span role='status'>
        Ход {getParticipantGenitive(activePlayer, participants)}
        {humanId &&
          !isHostile(humanId, activePlayer, participants) &&
          ' · Союзник'}
      </span>
      <span className={styles.Elapsed}>{elapsed} с</span>
      {!instant && (
        <button
          type='button'
          className={styles.Rush}
          title='Оставшиеся ходы ИИ — без анимаций'
          onClick={() => rush(true)}
        >
          Ускорить »
        </button>
      )}
    </div>
  );
};

/**
 * Сообщает о смене хода: постоянный индикатор, пока ходят враги, и лента
 * «Ваш ход» с номером хода. Начало своего хода дублирует звуковой сигнал,
 * поэтому видно и без звука.
 *
 * Лента живёт на своей CSS-анимации: подписка на стор перезапускает её при
 * каждом возврате хода человеку.
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
      // Ход ИИ при человеке за экраном показывает EnemyTurn.
      const human = state.participants.some(p => p.controller === 'human');
      if (controller !== 'ai' && controller !== 'human') return;
      if (controller === 'ai' && human) {
        // Быстро завершённый свой ход: лента «Ваш ход» не висит поверх врагов.
        element?.classList.remove(styles.Visible);
        if (live.current) live.current.textContent = '';
        return;
      }
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
      <EnemyTurn />
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
