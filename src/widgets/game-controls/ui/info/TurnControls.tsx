import { useEffect, useRef } from 'react';
import { useGameLoopSelectors } from '@features/game-loop';
import styles from './TurnControls.styles.module.css';

type Props = {
  onNextTurn: () => void;
  onReset: () => void;
};

export const TurnControls = ({ onNextTurn, onReset }: Props) => {
  const { activePlayer, humanId } = useGameLoopSelectors();
  const isOwnTurn = activePlayer === humanId;
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (event: Event) => {
      const element = menu.current;
      if (!element?.open) return;
      if (event.type === 'pointerdown' && event.target instanceof Node) {
        if (element.contains(event.target)) return;
      }
      element.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(event);
    };

    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className={styles.ButtonRow}>
      <button
        className={styles.EndTurnButton}
        onClick={onNextTurn}
        disabled={!isOwnTurn}
      >
        {isOwnTurn ? 'Завершить ход' : 'Ход противника…'}
      </button>

      <details className={styles.Menu} ref={menu}>
        <summary>Меню</summary>
        <div className={styles.Dropdown}>
          <button
            className={styles.DangerButton}
            onClick={() => {
              if (menu.current) menu.current.open = false;
              onReset();
            }}
          >
            Сбросить игру
          </button>
        </div>
      </details>
    </div>
  );
};
