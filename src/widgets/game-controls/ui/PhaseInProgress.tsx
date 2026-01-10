import { useState } from 'react';
import { ConfirmDialog } from '@shared/ui';
import { nextTurn, resetGame } from '@features/game-loop';
import { useSelectionSelectors } from '@features/selection';
import { useMovementStore } from '@features/pathfinding';
import {
  ResourcesInfo,
  TurnControls,
  TurnInfo,
  SelectedEntityInfo,
  WorkerBuildOptions,
} from './info';
import styles from './styles.module.css';

export const PhaseInProgress = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const {
    selection,
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
  } = useSelectionSelectors();
  const { clearMovement } = useMovementStore();

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
    clearMovement();
    resetGame();
  };

  return (
    <>
      <section className={styles.Section}>
        <TurnInfo />
        <ResourcesInfo />
        <TurnControls
          onNextTurn={onNextTurn}
          onReset={() => setShowResetConfirm(true)}
        />
      </section>

      {(cell || unit || building) && (
        <>
          <SelectedEntityInfo cell={cell} unit={unit} building={building} />
          {unit && <WorkerBuildOptions unit={unit} />}
        </>
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
