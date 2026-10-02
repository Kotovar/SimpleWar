import { useState, type ReactNode } from 'react';
import { MOVE_COST, type Building, type Cell, type Unit } from '@shared/config';
import { ConfirmDialog } from '@shared/ui';
import { useMapViewer } from '@entities/settings';
import {
  getCellKnowledge,
  getKnownCellType,
  useParticipantKnowledge,
} from '@entities/perceptions';
import {
  getPendingUnits,
  nextTurn,
  resetGame,
  surrender,
  useGameLoopSelectors,
} from '@features/game-loop';
import { usePreferencesStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { getHealTargets } from '@features/combat';
import { canUnitStep, getAttackableTargets } from '@features/pathfinding';
import { useSelectionSelectors } from '@features/selection';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import {
  AiTurnBanner,
  EndTurnConfirm,
  CommandToasts,
  ResourcesInfo,
  TurnControls,
  TurnInfo,
  SelectedEntityInfo,
  WorkerBuildOptions,
  UnitOptions,
  WorkerJobs,
  BuildingManage,
  ResearchPanel,
  DebugPanel,
  SiegeStrike,
} from './info';
import { SandboxControls } from './sandbox';
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

    <p className={styles.Hint}>
      Рудник и лесопилка приносят доход, только если внутри работает рабочий:
      подведите его вплотную и нажмите «Работать». Здание без рабочего помечено
      жёлтым «!», с рабочим — зелёной отметкой.
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
      <li>
        <kbd>Tab</kbd> следующий юнит с действиями
      </li>
      <li>
        <kbd>.</kbd> свободный рабочий
      </li>
      <li>
        <kbd>H</kbd> к ратуше
      </li>
      <li>
        <kbd>Esc</kbd> отменить режим или выбор
      </li>
    </ul>
    <p className={styles.Hint}>Клавиши работают на любой раскладке.</p>
  </div>
);

type Props = {
  /** Мини-карта над сведениями о выбранном. */
  minimap?: ReactNode;
};

/**
 * Есть ли у бойца видимая цель в дальности: враг (по знаниям владельца) или,
 * у лекаря, раненый свой. Осадная машина бьёт по клетке, а не по цели, —
 * без шагов она в напоминание не попадает.
 */
const hasTarget = (unit: Unit, units: Unit[]) => {
  if (unit.role !== 'military' || unit.type === 'siege') return false;
  if (unit.type === 'healer') return getHealTargets(unit, units).length > 0;
  return (
    getAttackableTargets(unit, unit.attackRange, unit.owner, unit.type).length >
    0
  );
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
    realCell && knownType
      ? {
          ...realCell,
          type: knownType,
          isWalkable: MOVE_COST[knownType] !== undefined,
        }
      : null;
  const isUnknownCell = !!realCell && !knownType;

  return { selection, cell, unit, building, isUnknownCell };
};

/** Найм, управление своим зданием и исследования своей кузницы. */
const BuildingActions = ({ building }: { building: Building }) => {
  const { humanId } = useGameLoopSelectors();
  const isOwn = building.owner === humanId;
  return (
    <>
      <UnitOptions building={building} />
      {isOwn && <BuildingManage building={building} />}
      {isOwn && building.type === 'forge' && (
        <ResearchPanel owner={building.owner} />
      )}
    </>
  );
};

/** Сведения и действия для выбранного объекта с учётом видимости. */
const SelectionDetails = () => {
  const { selection, cell, unit, building, isUnknownCell } =
    useKnownSelection();
  const { humanId } = useGameLoopSelectors();

  return (
    <>
      {isUnknownCell && <p className={styles.Hint}>Клетка не разведана.</p>}
      {(cell || unit || building) && (
        <>
          <SelectedEntityInfo cell={cell} unit={unit} building={building} />
          {unit?.role === 'civil' && unit.owner === humanId && (
            <WorkerJobs unit={unit} />
          )}
          {unit && <WorkerBuildOptions unit={unit} />}
          {unit?.role === 'military' &&
            unit.type === 'siege' &&
            unit.owner === humanId && <SiegeStrike unit={unit} />}
          {building && <BuildingActions building={building} />}
        </>
      )}

      {selection === null && <EmptySelection />}
    </>
  );
};

export const PhaseInProgress = ({ minimap }: Props) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);
  const [pending, setPending] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const { clearSelection } = useSelectionSelectors();
  const { resetStore: clearMovement } = useMovementStore();
  const { resetStore: clearHighlight } = useHighlightStore();
  const { humanId } = useGameLoopSelectors();

  const clearInteraction = () => {
    clearSelection();
    clearMovement();
    clearHighlight();
  };

  const endTurn = () => {
    setPending(0);
    if (humanId) nextTurn(humanId);
    clearInteraction();
  };

  // Перед концом хода — вопрос, если свои юниты ещё могут действовать.
  const onNextTurn = () => {
    const units = Object.values(useUnitsStore.getState().units);
    const count = humanId
      ? getPendingUnits(units, humanId, canUnitStep, unit =>
          hasTarget(unit, units),
        ).length
      : 0;
    if (count > 0 && usePreferencesStore.getState().confirmEndTurn) {
      setPending(count);
      return;
    }
    endTurn();
  };

  const onSurrender = () => {
    setShowSurrender(false);
    if (humanId) surrender(humanId);
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
          onSurrender={humanId ? () => setShowSurrender(true) : undefined}
        />
      </header>

      <AiTurnBanner />
      <CommandToasts />

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
        <SelectionDetails />
        <SandboxControls />
        <DebugPanel />
      </aside>

      <EndTurnConfirm
        pending={pending}
        onConfirm={endTurn}
        onCancel={() => setPending(0)}
      />

      <ConfirmDialog
        isOpen={showSurrender}
        title='Сдаться'
        message='Сдаться и закончить партию поражением?'
        confirmText='Сдаться'
        cancelText='Продолжить игру'
        onConfirm={onSurrender}
        onCancel={() => setShowSurrender(false)}
      />

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
