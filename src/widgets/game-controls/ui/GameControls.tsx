import {
  CANVAS_SIZE,
  GRID_SIZE,
  BUILDINGS_NAME,
  OWNER_NAME,
  TERRAIN_NAME,
  UNITS_NAME,
} from '@shared/config';
import { useSelectionSelectors } from '@features/selection';
import { nextTurn, useGameLoopSelectors } from '@features/game-loop';
import { useMovementStore } from '@features/pathfinding';
import styles from './styles.module.css';

export const GameControls = () => {
  const {
    selection,
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
  } = useSelectionSelectors();

  const { currentTurn } = useGameLoopSelectors();
  const { clearMovement } = useMovementStore();

  const cell = terrainSelection.getSelectedCell();
  const unit = unitsSelection.getSelectedUnit();
  const building = buildingsSelection.getSelectedBuilding();

  const onNextTurn = () => {
    nextTurn();
    clearSelection();
    clearMovement();
  };

  return (
    <section className={styles.GameControls}>
      <h1>Simple Wars</h1>
      <div className={styles.Info}>
        <section className={styles.Section}>
          <div>Текущий ход: {currentTurn}</div>
          <div>Поле: {GRID_SIZE + ' на ' + GRID_SIZE}</div>
          <div>Ширина: {CANVAS_SIZE + ' пикселей'}</div>

          <button className={styles.Button} onClick={onNextTurn}>
            Следующий ход
          </button>
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
            <div>
              Ходы: {unit.movePoints} / {unit.maxMovePoints}
            </div>
            <div>
              Очков атаки: {unit.attackPoints} / {unit.maxAttackPoints}
            </div>
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
