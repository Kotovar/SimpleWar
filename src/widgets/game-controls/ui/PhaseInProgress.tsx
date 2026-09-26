import { useState, type ReactNode } from 'react';
import type { Cell } from '@shared/config';
import { ConfirmDialog } from '@shared/ui';
import { useMapViewer } from '@entities/settings';
import {
  getCellKnowledge,
  getKnownCellType,
  useParticipantKnowledge,
} from '@entities/perceptions';
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
        <kbd>ПКМ</kbd> перетаскивание карты (или средняя кнопка, Пробел + ЛКМ)
      </li>
      <li>
        <kbd>Колесо</kbd> масштаб к курсору
      </li>
      <li>
        <kbd>WASD</kbd> или стрелки — сдвиг камеры
      </li>
    </ul>
  </div>
);

type Props = {
  /** Мини-карта над сведениями о выбранном. */
  minimap?: ReactNode;
};

/** Выбранные объекты и рельеф, доступные смотрящему. */
const useKnownSelection = () => {
  const { selection, terrainSelection, unitsSelection, buildingsSelection } =
    useSelectionSelectors();
  const { humanId } = useGameLoopSelectors();
  const viewer = useMapViewer(humanId);
  const knowledge = useParticipantKnowledge(viewer === 'world' ? null : viewer);

  // Панель показывает только то, что видит смотрящий: чужой объект
  // вне обзора и настоящий рельеф неразведанной клетки не раскрываются.
  const canSee = (entity: { owner: string; x: number; y: number } | null) =>
    !!entity &&
    (viewer === 'world' ||
      entity.owner === viewer ||
      getCellKnowledge(knowledge, entity.x, entity.y) === 'visible');
  const selectedUnit = unitsSelection.getSelectedUnit();
  const selectedBuilding = buildingsSelection.getSelectedBuilding();
  const unit = canSee(selectedUnit) ? selectedUnit : null;
  const building = canSee(selectedBuilding) ? selectedBuilding : null;
  const realCell = terrainSelection.getSelectedCell();
  const knownType =
    realCell && viewer !== 'world'
      ? getKnownCellType(knowledge, realCell.x, realCell.y)
      : realCell?.type;
  const cell: Cell | null =
    realCell && knownType ? { ...realCell, type: knownType } : null;
  const isUnknownCell = !!realCell && !knownType;

  return { selection, cell, unit, building, isUnknownCell };
};

export const PhaseInProgress = ({ minimap }: Props) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { selection, cell, unit, building, isUnknownCell } =
    useKnownSelection();
  const { clearSelection } = useSelectionSelectors();
  const { resetStore: clearMovement } = useMovementStore();
  const { resetStore: clearHighlight } = useHighlightStore();
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

      <aside
        className={styles.ContextPanel}
        aria-label='Панель партии'
        data-collapsed={collapsed}
      >
        <button
          type='button'
          className={styles.PanelToggle}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(value => !value)}
        >
          {collapsed ? 'Показать панель' : 'Свернуть панель'}
        </button>
        {minimap}
        <DebugPanel />
        {isUnknownCell && <p className={styles.Hint}>Клетка не разведана.</p>}
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
