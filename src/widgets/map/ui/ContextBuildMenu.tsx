import {
  BUILDINGS_NAME,
  BUILDINGS_CONFIG,
  type ParticipantId,
  type Position,
} from '@shared/config';
import { worldToScreen } from '@shared/lib';
import { GoldIcon, WoodIcon } from '@shared/ui';
import { useSettingsStore } from '@entities/settings';
import { useUnitsStore } from '@entities/units';
import { getTurnRejection } from '@entities/games';
import { useSelectionStore } from '@features/selection';
import { build, getContextBuildings, giveBuildOrder } from '@features/build';
import {
  assignWorker,
  getContextWorkplace,
  giveWorkOrder,
} from '@features/workers';
import {
  advanceOrder,
  useHighlightStore,
  useMovementStore,
} from '@features/pathfinding';
import styles from './styles.module.css';

type Props = {
  target: Position & { workerId: string };
  humanId: ParticipantId | null;
  onClose: () => void;
  onFocus: () => void;
};

/** Контекстные приказы рабочего и их немедленное исполнение на оставшиеся очки. */
export const ContextBuildMenu = ({
  target,
  humanId,
  onClose,
  onFocus,
}: Props) => {
  const camera = useSettingsStore(state => state.camera);
  const cellSize = useSettingsStore(state => state.cellSize);
  const mapSize = useSettingsStore(state => state.viewport);
  const selection = useSelectionStore(state => state.selection);
  const worker = useUnitsStore(state => state.units[target.workerId]);
  if (selection?.kind !== 'unit' || selection.id !== target.workerId)
    return null;
  if (!worker || !humanId || getTurnRejection(humanId)) return null;
  const menuOptions = getContextBuildings(worker, humanId, target);
  const menuWorkplace = getContextWorkplace(worker, humanId, target);
  const finishOrder = (workerId: string) => {
    const stopped = advanceOrder(humanId, workerId, unit =>
      unit.order.type === 'work'
        ? assignWorker({
            actor: humanId,
            workerId: unit.id,
            buildingId: unit.order.buildingId,
          })
        : build({ actor: humanId, workerId: unit.id, ...unit.order }),
    );
    onClose();
    useSelectionStore.getState().clearSelection();
    useMovementStore.getState().resetStore();
    useHighlightStore.getState().resetStore();
    if (stopped) {
      useSelectionStore.getState().selectUnit(workerId);
      useMovementStore.getState().calculateActionHighlights(workerId);
    }
    onFocus();
  };
  const menuPoint = worldToScreen(camera, cellSize, {
    x: target.x + 0.5,
    y: target.y,
  });
  if (!menuOptions.length && !menuWorkplace) return null;
  return (
    <div
      className={styles.BuildMenu}
      role='group'
      aria-label='Контекстная стройка'
      style={{
        left: Math.max(4, Math.min(menuPoint.x, mapSize.width - 240)),
        top: Math.max(4, Math.min(menuPoint.y, mapSize.height - 280)),
      }}
      onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
    >
      <strong>
        {menuWorkplace
          ? BUILDINGS_NAME[menuWorkplace.type]
          : `Построить (${target.x + 1}, ${target.y + 1})`}
      </strong>
      {menuOptions.map(buildingType => (
        <button
          key={buildingType}
          type='button'
          aria-label={`${BUILDINGS_NAME[buildingType]}: ${BUILDINGS_CONFIG[buildingType].cost.gold} золота, ${BUILDINGS_CONFIG[buildingType].cost.wood} древесины`}
          onClick={() => {
            const result = giveBuildOrder({
              actor: humanId,
              workerId: target.workerId,
              buildingType,
              x: target.x,
              y: target.y,
            });
            if (!result.ok) return;
            finishOrder(target.workerId);
          }}
        >
          <span>{BUILDINGS_NAME[buildingType]}</span>
          <span className={styles.ContextCost}>
            <span
              aria-label={`${BUILDINGS_CONFIG[buildingType].cost.gold} золота`}
              title='Золото'
            >
              <GoldIcon />
              {BUILDINGS_CONFIG[buildingType].cost.gold}
            </span>
            <span
              aria-label={`${BUILDINGS_CONFIG[buildingType].cost.wood} древесины`}
              title='Древесина'
            >
              <WoodIcon />
              {BUILDINGS_CONFIG[buildingType].cost.wood}
            </span>
          </span>
        </button>
      ))}
      {menuWorkplace && (
        <button
          type='button'
          onClick={() => {
            const result = giveWorkOrder({
              actor: humanId,
              workerId: target.workerId,
              buildingId: menuWorkplace.id,
            });
            if (result.ok) finishOrder(target.workerId);
          }}
        >
          Работать
        </button>
      )}
      <button
        type='button'
        onClick={() => {
          onClose();
          onFocus();
        }}
      >
        Отмена
      </button>
    </div>
  );
};
