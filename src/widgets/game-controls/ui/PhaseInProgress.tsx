import { useState } from 'react';
import { ConfirmDialog } from '@shared/ui';
import {
  BUILDINGS_NAME,
  OWNER_NAME,
  TERRAIN_NAME,
  UNITS_NAME,
} from '@shared/config';
import { useEconomySelectors } from '@entities/economies';
import { useBuildingsSelectors } from '@entities/buildings';
import {
  useGameLoopSelectors,
  nextTurn,
  resetGame,
  calculateIncome,
} from '@features/game-loop';

import { useSelectionSelectors } from '@features/selection';
import { useMovementStore } from '@features/pathfinding';
import styles from './styles.module.css';

export const PhaseInProgress = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { activePlayer, currentTurn } = useGameLoopSelectors();
  const {
    selection,
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
  } = useSelectionSelectors();
  const { clearMovement } = useMovementStore();
  const { resources } = useEconomySelectors();
  const { getEconomicBuildings } = useBuildingsSelectors();

  const cell = terrainSelection.getSelectedCell();
  const unit = unitsSelection.getSelectedUnit();
  const building = buildingsSelection.getSelectedBuilding();

  const onNextTurn = async () => {
    nextTurn();
    clearSelection();
    clearMovement();
  };

  const onResetGame = () => {
    setShowResetConfirm(false);

    clearSelection();
    resetGame();
  };

  const income = calculateIncome(getEconomicBuildings('player'));

  return (
    <>
      <section className={styles.Section}>
        <div>Текущий ход: {currentTurn}</div>
        <div>Ходит: {activePlayer === 'ai' ? 'компьютер' : 'игрок'}</div>

        <div className={styles.Resources}>
          <div>
            <span className={styles.Gold}>Золото:</span> {resources.player.gold}{' '}
            <span className={styles.Income}>(+{income.gold}/ход)</span>
          </div>
          <div>
            <span className={styles.Wood}>Древесина:</span>{' '}
            {resources.player.wood}{' '}
            <span className={styles.Income}>(+{income.wood}/ход)</span>
          </div>
        </div>

        <div className={styles.ButtonRow}>
          <button
            className={styles.EndTurnButton}
            onClick={onNextTurn}
            disabled={activePlayer === 'ai'}
          >
            Завершить ход
          </button>

          <button
            className={styles.DangerButton}
            onClick={() => setShowResetConfirm(true)}
          >
            Сбросить игру
          </button>
        </div>
      </section>

      {/* Информация о выбранной сущности */}
      {(cell || unit || building) && (
        <section className={styles.EntityInfo}>
          <div className={styles.EntityHeader}>
            {unit && (
              <>
                <span className={styles.EntityIcon}>⚔️</span>
                <span>{UNITS_NAME[unit.type]}</span>
              </>
            )}
            {building && (
              <>
                <span className={styles.EntityIcon}>🏰</span>
                <span>{BUILDINGS_NAME[building.type]}</span>
              </>
            )}
            {cell && (
              <>
                <span className={styles.EntityIcon}>🌍</span>
                <span>Клетка</span>
              </>
            )}
          </div>

          <div className={styles.EntityDetails}>
            {cell && (
              <>
                <div>
                  Координаты: ({cell.x}, {cell.y})
                </div>
                <div>Тип: {TERRAIN_NAME[cell.type]}</div>
                <div>
                  Проходимость:{' '}
                  {cell.isWalkable ? (
                    <span className={styles.IsWalkable}>Проходима</span>
                  ) : (
                    <span className={styles.IsNotWalkable}>Непроходима</span>
                  )}
                </div>
              </>
            )}

            {(unit || building) && (
              <div>Владелец: {OWNER_NAME[(unit || building)!.owner]}</div>
            )}

            {(unit || building) && (
              <div>
                Здоровье:{' '}
                <span className={styles.HP}>
                  {(unit || building)!.hp} / {(unit || building)!.maxHp}
                </span>
              </div>
            )}

            {unit && (
              <>
                <div>
                  Движение:{' '}
                  <span className={styles.MovePoints}>
                    {unit.movePoints} / {unit.maxMovePoints}
                  </span>
                </div>
                <div>
                  Атаки:{' '}
                  <span className={styles.AttackPoints}>
                    {unit.attackPoints} / {unit.maxAttackPoints}
                  </span>
                </div>
                <div>Радиус атаки: {unit.attackRange}</div>
                <div>Урон: {unit.attack}</div>
              </>
            )}
          </div>
        </section>
      )}

      {selection === null && (
        <div className={styles.Hint}>
          Кликните по карте, чтобы выбрать клетку
        </div>
      )}

      <ConfirmDialog
        isOpen={showResetConfirm}
        title='Сброс игры'
        message='Точно сбросить игру? Весь прогресс будет потерян.'
        confirmText='Да, сбросить'
        cancelText='Отмена'
        onConfirm={onResetGame}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
};
