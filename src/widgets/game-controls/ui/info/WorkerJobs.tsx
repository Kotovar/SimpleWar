import {
  BUILDINGS_NAME,
  REPAIR,
  type Building,
  type CivilUnit,
} from '@shared/config';
import { isAdjacent } from '@shared/lib';
import { GoldIcon, WoodIcon } from '@shared/ui';
import { useBuildingsStore } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomyStore } from '@entities/economies';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import {
  assignWorker,
  getClearableCells,
  getRepairAmount,
  repair,
  unassignWorker,
} from '@features/workers';
import styles from './OptionCards.styles.module.css';

const where = ({ x, y }: Building) => `(${x}, ${y})`;

/**
 * Работа своего рабочего: добыча на соседнем руднике или лесопилке,
 * ремонт соседних своих зданий и расчистка леса. Кнопки вызывают те же
 * команды, что и ИИ; занятость рабочих мест видна до клика.
 */
export const WorkerJobs = ({ unit }: { unit: CivilUnit }) => {
  const buildings = useBuildingsStore(state => state.buildings);
  const units = useUnitsStore(state => state.units);
  const resources = useEconomyStore(state => state.resources[unit.owner]);
  const clearableCells = useHighlightStore(state => state.clearableCells);
  const setClearableCells = useHighlightStore(state => state.setClearableCells);
  const clearHighlight = useHighlightStore(state => state.resetStore);
  const { calculateActionHighlights, resetStore: clearMovement } =
    useMovementStore.getState();

  const actor = unit.owner;
  const nearby = Object.values(buildings).filter(
    building => building.owner === actor && isAdjacent(unit, building),
  );
  const workplaces = nearby.filter(({ role }) => role === 'resource');
  const damaged = nearby.filter(({ hp, maxHp }) => hp < maxHp);
  const current = unit.workplaceId ? buildings[unit.workplaceId] : null;
  const holderOf = (id: string) =>
    Object.values(units).find(
      other =>
        other.id !== unit.id &&
        other.role === 'civil' &&
        other.workplaceId === id,
    );
  const canPay =
    resources.gold >= REPAIR.cost.gold && resources.wood >= REPAIR.cost.wood;
  const hasAction = unit.buildPoints > 0;

  // После приказа подсветка движения пересчитывается: действие потрачено.
  const refresh = () => {
    clearHighlight();
    clearMovement();
    calculateActionHighlights(unit.id);
  };

  const toggleClearing = () => {
    if (clearableCells) {
      refresh();
      return;
    }
    clearHighlight();
    clearMovement();
    setClearableCells(getClearableCells(actor, unit));
  };

  return (
    <section className={styles.Section}>
      <header className={styles.Header}>
        <h4 className={styles.Title}>Работа</h4>
        <span className={styles.Points} data-empty={!current}>
          {current
            ? `Добывает: ${BUILDINGS_NAME[current.type]}`
            : 'Без назначения'}
        </span>
      </header>

      {current && (
        <p className={styles.Prompt}>
          {hasAction
            ? `В конце хода принесёт +15 и потратит рабочее действие.`
            : 'Рабочее действие уже потрачено: в этот ход добычи не будет.'}{' '}
          Движение или стройка снимут назначение.
        </p>
      )}

      <div className={styles.List}>
        {current && (
          <button
            type='button'
            className={styles.Card}
            onClick={() => unassignWorker({ actor, workerId: unit.id })}
          >
            <span className={styles.Content}>
              <span className={styles.Name}>Снять с работы</span>
              <span className={styles.Info}>
                {BUILDINGS_NAME[current.type]} {where(current)} останется без
                рабочего
              </span>
            </span>
          </button>
        )}

        {workplaces
          .filter(building => building.id !== current?.id)
          .map(building => {
            const holder = holderOf(building.id);
            return (
              <button
                key={building.id}
                type='button'
                className={styles.Card}
                disabled={!!holder}
                onClick={() =>
                  assignWorker({
                    actor,
                    workerId: unit.id,
                    buildingId: building.id,
                  })
                }
              >
                <span className={styles.Content}>
                  <span className={styles.Name}>
                    Работать: {BUILDINGS_NAME[building.type]} {where(building)}
                  </span>
                  <span className={styles.Info}>
                    +15 {building.type === 'mine' ? 'золота' : 'дерева'} в конец
                    своего хода за рабочее действие
                  </span>
                  {holder && (
                    <span className={styles.Reason}>
                      Место занято другим рабочим
                    </span>
                  )}
                </span>
              </button>
            );
          })}

        {damaged.map(building => (
          <button
            key={building.id}
            type='button'
            className={styles.Card}
            disabled={!hasAction || !canPay}
            onClick={() => {
              repair({ actor, workerId: unit.id, buildingId: building.id });
              refresh();
            }}
          >
            <span className={styles.Content}>
              <span className={styles.Name}>
                Починить: {BUILDINGS_NAME[building.type]} (+
                {getRepairAmount(building.hp, building.maxHp)} HP)
              </span>
              <span className={styles.Costs}>
                <span
                  className={styles.Cost}
                  data-lacking={resources.gold < REPAIR.cost.gold}
                >
                  <GoldIcon /> {REPAIR.cost.gold} золота
                </span>
                <span
                  className={styles.Cost}
                  data-lacking={resources.wood < REPAIR.cost.wood}
                >
                  <WoodIcon /> {REPAIR.cost.wood} дерева
                </span>
              </span>
              {!hasAction && (
                <span className={styles.Reason}>
                  Рабочее действие уже потрачено
                </span>
              )}
            </span>
          </button>
        ))}

        <button
          type='button'
          className={styles.Card}
          disabled={!hasAction && !clearableCells}
          aria-pressed={!!clearableCells}
          onClick={toggleClearing}
        >
          <span className={styles.Content}>
            <span className={styles.Name}>Расчистить лес</span>
            <span className={styles.Info}>
              {clearableCells
                ? clearableCells.length
                  ? 'Кликните по подсвеченному лесу. Повторный клик по карточке отменит выбор.'
                  : 'Рядом нет видимого свободного леса.'
                : 'Соседняя клетка леса станет полем; дерево не выдаётся, тратится очко стройки.'}
            </span>
            {!hasAction && !clearableCells && (
              <span className={styles.Reason}>Нет очка стройки</span>
            )}
          </span>
        </button>
      </div>
    </section>
  );
};
