import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Unit } from '@shared/config';
import { isTyping } from '@shared/lib';
import { ConfirmDialog } from '@shared/ui';
import {
  getPendingUnits,
  nextTurn,
  resetGame,
  surrender,
  useGameLoopSelectors,
} from '@features/game-loop';
import { useUnitsStore } from '@entities/units';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { getHealTargets } from '@features/combat';
import { canUnitStep, getAttackableTargets } from '@features/pathfinding';
import { useSelectionSelectors, useSelectionStore } from '@features/selection';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import {
  AiTurnBanner,
  EndTurnConfirm,
  CommandToasts,
  ResourcesInfo,
  TurnControls,
  TurnInfo,
} from './info';
import { ActionBar } from './ActionBar';
import { MinimapOverlay } from './MinimapOverlay';
import { SelectionCard } from './SelectionCard';
import { ToolsDrawer, ToolsToggle } from './ToolsDrawer';
import { shouldConfirmEndTurn } from '../model/confirmEndTurn';
import { runOrders } from '../model/runOrders';
import styles from './styles.module.css';

type Props = {
  /** Мини-карта поверх карты вверху справа. */
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

export const PhaseInProgress = ({ minimap }: Props) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSurrender, setShowSurrender] = useState(false);
  const [pending, setPending] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toggleTools = () => setToolsOpen(open => !open);

  const { clearSelection } = useSelectionSelectors();
  const { resetStore: clearMovement } = useMovementStore();
  const { resetStore: clearHighlight } = useHighlightStore();
  const { humanId } = useGameLoopSelectors();
  const hasOrders = useUnitsStore(state =>
    Object.values(state.units).some(
      unit => unit.owner === humanId && unit.order && !unit.order.stopped,
    ),
  );

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

  const pendingUnits = () => {
    const units = Object.values(useUnitsStore.getState().units);
    return humanId
      ? getPendingUnits(units, humanId, canUnitStep, unit =>
          hasTarget(unit, units),
        )
      : [];
  };

  const returnToUnit = () => {
    setPending(0);
    const units = pendingUnits();
    const unit = units.find(canUnitStep) ?? units[0];
    if (!unit) return;
    clearInteraction();
    useSelectionStore.getState().selectUnit(unit.id);
    useMovementStore.getState().calculateActionHighlights(unit.id);
    useSettingsStore.getState().centerOn(unit.x + 0.5, unit.y + 0.5);
  };

  // Сначала приказы; остановка не передаёт ход. Затем вопрос, если свои
  // юниты ещё могут действовать.
  const onNextTurn = () => {
    if (runOrders(humanId, clearInteraction)) return;
    const count = pendingUnits().length;
    if (count > 0 && shouldConfirmEndTurn()) {
      setPending(count);
      return;
    }
    endTurn();
  };

  // Enter завершает ход: не при вводе, не над открытым диалогом и не на
  // кнопке в фокусе — там Enter нажимает её саму.
  const endTurnKey = useRef(onNextTurn);
  useLayoutEffect(() => {
    endTurnKey.current = onNextTurn;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Enter' || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (isTyping(target) || target instanceof HTMLButtonElement) return;
      if (target instanceof HTMLAnchorElement) return;
      if (document.querySelector('dialog[open]')) return;
      const { activePlayer, phase } = useGameLoopStore.getState();
      if (phase !== 'inProgress' || activePlayer !== humanId) return;
      event.preventDefault();
      endTurnKey.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [humanId]);

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
        <ToolsToggle open={toolsOpen} onToggle={toggleTools} />
        <TurnControls
          onNextTurn={onNextTurn}
          onRunOrders={
            hasOrders ? () => runOrders(humanId, clearInteraction) : undefined
          }
          onReset={() => setShowResetConfirm(true)}
          onSurrender={humanId ? () => setShowSurrender(true) : undefined}
        />
      </header>

      <AiTurnBanner />
      <CommandToasts />
      <ActionBar />

      <SelectionCard />
      <ToolsDrawer open={toolsOpen} onToggle={toggleTools} />
      {minimap && <MinimapOverlay>{minimap}</MinimapOverlay>}

      <EndTurnConfirm
        pending={pending}
        onConfirm={endTurn}
        onCancel={returnToUnit}
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
