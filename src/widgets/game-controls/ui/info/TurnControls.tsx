import { useGameLoopSelectors } from '@features/game-loop';
import { KeyboardHelp } from '../KeyboardHelp';
import { GameMenu } from './GameMenu';
import styles from './TurnControls.styles.module.css';

type Props = {
  onOpenSaves?: () => void;
  onNextTurn: () => void;
  /** Исполнить отложенные приказы: идти в точку, строить, работать. */
  onRunOrders?: () => void;
  /** Сколько своих юнитов с активным приказом; без них кнопки нет. */
  ordersCount?: number;
  onReset: () => void;
  /** Сдача; нет — участника за экраном нет, кнопка скрыта. */
  onSurrender?: () => void;
};

export const TurnControls = ({
  onNextTurn,
  onRunOrders,
  ordersCount = 0,
  onReset,
  onSurrender,
  onOpenSaves,
}: Props) => {
  const { activePlayer, humanId } = useGameLoopSelectors();
  const isOwnTurn = activePlayer === humanId;

  return (
    <div className={styles.ButtonRow}>
      {humanId && (
        <>
          {onRunOrders && ordersCount > 0 && (
            <button
              className={styles.OrdersButton}
              aria-label='Выполнить приказы'
              title={
                isOwnTurn
                  ? `Юниты с отложенным приказом (идти в точку, строить, работать) продолжат его сейчас на оставшиеся очки. При «Завершить ход» это происходит само. Юнитов с приказом: ${ordersCount}`
                  : 'Доступно в свой ход'
              }
              onClick={onRunOrders}
              disabled={!isOwnTurn}
            >
              <span className={styles.Play} aria-hidden>
                ▶
              </span>
              <span className={styles.Long}>Выполнить приказы</span>
              <span className={styles.Short}>Приказы</span>
              <span className={styles.Count}>{ordersCount}</span>
            </button>
          )}
          <button
            className={styles.EndTurnButton}
            onClick={onNextTurn}
            disabled={!isOwnTurn}
          >
            {isOwnTurn ? 'Завершить ход' : 'Ход противника…'}
          </button>
        </>
      )}
      <GameMenu
        onOpenSaves={onOpenSaves}
        onReset={onReset}
        onSurrender={onSurrender}
      />
      <KeyboardHelp />
    </div>
  );
};
