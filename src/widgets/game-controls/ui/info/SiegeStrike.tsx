import { SIEGE_STRIKE, type MilitaryUnit } from '@shared/config';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import { getStrikeCells } from '@features/combat';
import styles from './OptionCards.styles.module.css';

/**
 * Подготовленный удар своей осадной машины: режим прицела по клетке
 * в дальности 2–5. Удар исполнится в начале следующего своего хода,
 * отметку клетки видят все участники.
 */
export const SiegeStrike = ({ unit }: { unit: MilitaryUnit }) => {
  const strikeCells = useHighlightStore(state => state.strikeCells);
  const setStrikeCells = useHighlightStore(state => state.setStrikeCells);
  const clearHighlight = useHighlightStore(state => state.resetStore);
  const { calculateActionHighlights, resetStore: clearMovement } =
    useMovementStore.getState();
  const prepared = unit.preparedStrike;
  const canAim = unit.attackPoints > 0 && !prepared;

  const toggle = () => {
    clearHighlight();
    clearMovement();
    if (strikeCells) {
      calculateActionHighlights(unit.id);
      return;
    }
    setStrikeCells(getStrikeCells(unit.owner, unit));
  };

  return (
    <section className={styles.Section}>
      <header className={styles.Header}>
        <h4 className={styles.Title}>Осада</h4>
        <span className={styles.Points} data-empty={!prepared}>
          {prepared
            ? `Удар по (${prepared.x}, ${prepared.y})`
            : 'Удар не готов'}
        </span>
      </header>
      <p className={styles.Prompt}>
        {prepared
          ? 'Удар исполнится в начале вашего следующего хода: урон получит всё на клетке, включая ваши объекты. Движение отменит удар.'
          : `Бьёт только подготовленным ударом по клетке в ${SIEGE_STRIKE.minRange}–${SIEGE_STRIKE.maxRange} клетках. Отметку увидят все, но не само орудие.`}
      </p>
      <div className={styles.List}>
        <button
          type='button'
          className={styles.Card}
          disabled={!canAim && !strikeCells}
          aria-pressed={!!strikeCells}
          onClick={toggle}
        >
          <span className={styles.Content}>
            <span className={styles.Name}>Подготовить удар</span>
            <span className={styles.Info}>
              {strikeCells
                ? 'Кликните по подсвеченной клетке. Повторный клик по карточке отменит прицел.'
                : 'Тратит боевое действие, движение до конца хода закончено.'}
            </span>
            {!canAim && !strikeCells && (
              <span className={styles.Reason}>
                {prepared ? 'Удар уже подготовлен' : 'Нет боевого действия'}
              </span>
            )}
          </span>
        </button>
      </div>
    </section>
  );
};
