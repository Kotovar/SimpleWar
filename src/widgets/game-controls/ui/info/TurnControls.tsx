import { useEffect, useRef } from 'react';
import { GUIDEBOOK_URL } from '@shared/config';
import { Checkbox } from '@shared/ui';
import { useGameLoopSelectors } from '@features/game-loop';
import { useDebugStore } from '@entities/settings';
import { useConfirmEndTurn } from '../../model/confirmEndTurn';
import { AudioSettings } from './AudioSettings';
import { KeyboardHelp } from '../KeyboardHelp';
import styles from './TurnControls.styles.module.css';

type Props = {
  onNextTurn: () => void;
  /** Исполнить приказы «Идти в точку»; нет — активных приказов нет. */
  onRunOrders?: () => void;
  onReset: () => void;
  /** Сдача; нет — участника за экраном нет, кнопка скрыта. */
  onSurrender?: () => void;
};

export const TurnControls = ({
  onNextTurn,
  onRunOrders,
  onReset,
  onSurrender,
}: Props) => {
  const { activePlayer, humanId } = useGameLoopSelectors();
  const isOwnTurn = activePlayer === humanId;
  const isDebug = useDebugStore(state => state.enabled);
  const setDebug = useDebugStore(state => state.setEnabled);
  const menu = useRef<HTMLDetailsElement>(null);
  const [confirmEndTurn, setConfirmEndTurn] = useConfirmEndTurn();

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
      if (event.key !== 'Escape' || !menu.current?.open) return;
      // Esc закрыл меню — карта не должна заодно снимать выбор.
      event.preventDefault();
      close(event);
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
      {onRunOrders && isOwnTurn && (
        <button
          className={styles.OrdersButton}
          title='Юниты с приказом «Идти в точку» пойдут на оставшиеся очки'
          onClick={onRunOrders}
        >
          Выполнить приказы
        </button>
      )}
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
            className={styles.MenuButton}
            aria-pressed={isDebug}
            onClick={() => {
              if (menu.current) menu.current.open = false;
              setDebug(!isDebug);
            }}
          >
            {isDebug ? 'Выключить режим отладки' : 'Режим отладки'}
          </button>
          <a
            className={styles.MenuButton}
            href={GUIDEBOOK_URL}
            target='_blank'
            rel='noopener'
            aria-label='Гайдбук (откроется в новой вкладке)'
            onClick={() => {
              if (menu.current) menu.current.open = false;
            }}
          >
            Гайдбук <span aria-hidden='true'>↗</span>
          </a>
          {onSurrender && (
            <button
              className={styles.DangerButton}
              onClick={() => {
                if (menu.current) menu.current.open = false;
                onSurrender();
              }}
            >
              Сдаться
            </button>
          )}
          <button
            className={styles.DangerButton}
            onClick={() => {
              if (menu.current) menu.current.open = false;
              onReset();
            }}
          >
            Сбросить игру
          </button>
          <Checkbox
            className={styles.MenuCheck}
            checked={confirmEndTurn}
            onChange={setConfirmEndTurn}
          >
            Предупреждать об непоходивших юнитах
          </Checkbox>
          <AudioSettings />
        </div>
      </details>
      <KeyboardHelp />
    </div>
  );
};
