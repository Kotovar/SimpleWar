import {
  CANVAS_SIZE,
  GRID_SIZE,
  BUILDINGS_NAME,
  OWNER_NAME,
  TERRAIN_NAME,
  UNITS_NAME,
} from '@shared/config';
import { useSelectionSelectors } from '@features/selection';
import styles from './styles.module.css';

export const GameControls = () => {
  const { selection, terrainSelection, unitsSelection, buildingsSelection } =
    useSelectionSelectors();

  const { getSelectedCell } = terrainSelection;
  const { getSelectedUnit } = unitsSelection;
  const { getSelectedBuilding } = buildingsSelection;

  const unit = getSelectedUnit();
  const building = getSelectedBuilding();
  const cell = getSelectedCell();

  return (
    <section className={styles.GameControls}>
      <h1>Simple Wars</h1>
      <div className={styles.Info}>
        <section className={styles.Section}>
          <div>Текущий ход: 1</div>
          <div>Поле: {GRID_SIZE + ' на ' + GRID_SIZE}</div>
          <div>Ширина: {CANVAS_SIZE + ' пикселей'}</div>
        </section>

        {cell && (
          <section className={styles.Section}>
            <div>
              Выбрана клетка: ({cell.x}, {cell.y})
            </div>
            <div>Тип: {TERRAIN_NAME[cell.type]}</div>
            <div>
              Проходима:{' '}
              {cell.isWalkable ? (
                <span className={styles.IsWalkable}>Да</span>
              ) : (
                <span className={styles.IsNotWalkable}>Нет</span>
              )}
            </div>
          </section>
        )}

        {unit && (
          <section className={styles.Section}>
            <div>Выбран юнит: {UNITS_NAME[unit.type]}</div>
            <div>Владелец: {OWNER_NAME[unit.owner]}</div>
            <div>
              HP: {unit.hp} / {unit.maxHp}
            </div>
            <div>Дальность хода: {unit.moveRange}</div>
            <div>Радиус атаки: {unit.attackRange}</div>
            <div>Урон: {unit.attack}</div>
          </section>
        )}

        {building && (
          <section className={styles.Section}>
            <div>Выбрано здание: {BUILDINGS_NAME[building.type]}</div>
            <div>Владелец: {OWNER_NAME[building.owner]}</div>
            <div>
              HP: {building.hp} / {building.maxHp}
            </div>
          </section>
        )}

        {selection === null && (
          <div>Кликните по карте, чтобы выбрать клетку</div>
        )}
      </div>
    </section>
  );
};
