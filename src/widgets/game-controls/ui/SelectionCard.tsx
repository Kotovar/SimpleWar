import { MOVE_COST, type Cell } from '@shared/config';
import { useMapViewer } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import {
  getCellKnowledge,
  getKnownCellType,
  useParticipantKnowledge,
} from '@entities/perceptions';
import { useGameLoopSelectors } from '@features/game-loop';
import { useSelectionSelectors } from '@features/selection';
import { SelectedEntityInfo } from './info';
import styles from './Overlays.styles.module.css';

/** Выбранные объекты и рельеф, доступные смотрящему. */
const useKnownSelection = () => {
  const { terrainSelection, unitsSelection, buildingsSelection } =
    useSelectionSelectors();
  const { humanId } = useGameLoopSelectors();
  const configuredViewer = useMapViewer(humanId);
  const review = useGameLoopStore(
    state => state.phase === 'gameOver' && state.reviewWorld,
  );
  const viewer = review ? 'world' : configuredViewer;
  const knowledge = useParticipantKnowledge(viewer === 'world' ? null : viewer);

  // Карточка показывает только то, что видит смотрящий: чужой объект
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

  return { cell, unit, building, isUnknownCell };
};

/**
 * Карточка выбранного поверх карты внизу слева: портрет, HP, очки, бонусы.
 * Без выбора не показывается — карта остаётся свободной.
 */
export const SelectionCard = () => {
  const { cell, unit, building, isUnknownCell } = useKnownSelection();
  if (!cell && !unit && !building && !isUnknownCell) return null;

  return (
    <aside className={styles.Card} aria-label='Выбранный объект'>
      {isUnknownCell ? (
        <p className={styles.Note}>Клетка не разведана.</p>
      ) : (
        <SelectedEntityInfo cell={cell} unit={unit} building={building} />
      )}
    </aside>
  );
};
