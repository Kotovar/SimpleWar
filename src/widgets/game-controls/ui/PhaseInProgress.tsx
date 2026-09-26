import { useState } from 'react';
import { ConfirmDialog } from '@shared/ui';
import { nextTurn, resetGame, useGameLoopSelectors } from '@features/game-loop';
import { useSelectionSelectors } from '@features/selection';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import {
  AiTurnBanner,
  ResourcesInfo,
  TurnControls,
  TurnInfo,
  SelectedEntityInfo,
  WorkerBuildOptions,
  UnitOptions,
  DebugPanel,
} from './info';
import styles from './styles.module.css';

const LEGEND = [
  { kind: 'move', text: 'Куда можно пойти' },
  { kind: 'produce', text: 'Где можно построить или нанять' },
  { kind: 'attack', text: 'Кого можно атаковать' },
] as const;

/** Пустая панель подсказывает управление и значение подсветок на карте. */
const EmptySelection = () => (
  <div className={styles.Empty}>
    <p className={styles.EmptyTitle}>Ничего не выбрано</p>
    <p className={styles.Hint}>
      Кликните по своему юниту, зданию или клетке карты.
    </p>

    <ul className={styles.Legend}>
      {LEGEND.map(({ kind, text }) => (
        <li key={kind}>
          <span className={styles.Swatch} data-kind={kind} aria-hidden />
          {text}
        </li>
      ))}
    </ul>

    <ul className={styles.Controls}>
      <li>
        <kbd>ЛКМ</kbd> выбрать или выполнить действие
      </li>
      <li>
        <kbd>ПКМ</kbd> перетаскивание карты
      </li>
      <li>
        <kbd>Колесо</kbd> масштаб
      </li>
    </ul>
  </div>
);

export const PhaseInProgress = () => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const {
    selection,
    terrainSelection,
    unitsSelection,
    buildingsSelection,
    clearSelection,
  } = useSelectionSelectors();
  const { resetStore: clearMovement } = useMovementStore();
  const { resetStore: clearHighlight } = useHighlightStore();

  const cell = terrainSelection.getSelectedCell();
  const unit = unitsSelection.getSelectedUnit();
  const building = buildingsSelection.getSelectedBuilding();

  const { humanId } = useGameLoopSelectors();

  const clearInteraction = () => {
    clearSelection();
    clearMovement();
    clearHighlight();
  };

  const onNextTurn = () => {
    if (humanId) nextTurn(humanId);
    clearInteraction();
  };

  const onResetGame = () => {
    setShowResetConfirm(false);
    resetGame();
  };

  return (
    <>
      <header className={styles.Toolbar}>
        <TurnInfo />
        <ResourcesInfo />
        <TurnControls
          onNextTurn={onNextTurn}
          onReset={() => setShowResetConfirm(true)}
        />
      </header>

      <AiTurnBanner />

      <aside className={styles.ContextPanel} aria-label='Выбранный объект'>
        <DebugPanel />
        {(cell || unit || building) && (
          <>
            <SelectedEntityInfo cell={cell} unit={unit} building={building} />
            {unit && <WorkerBuildOptions unit={unit} />}
            {building && <UnitOptions building={building} />}
          </>
        )}

        {selection === null && <EmptySelection />}
      </aside>

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
