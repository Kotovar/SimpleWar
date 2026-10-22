import { MOVE_COST, type Cell } from '@shared/config';
import { useMapViewer } from '@entities/settings';
import { useGameLoopStore } from '@entities/games';
import { useSitesStore } from '@entities/sites';
import { useMapStore } from '@entities/maps';
import {
  getCellKnowledge,
  getKnownCellType,
  isKnownRoad,
  isKnownRichGold,
  useParticipantKnowledge,
} from '@entities/perceptions';
import { useGameLoopSelectors } from '@features/game-loop';
import { useSelectionSelectors } from '@features/selection';
import { SelectedEntityInfo } from './info';
import { SelectedSiteInfo } from './info/SelectedSiteInfo';
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
  const worldSites = useSitesStore(state => state.sites);
  const grid = useMapStore(state => state.grid);

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
  const realCell =
    terrainSelection.getSelectedCell() ??
    (building?.type === 'mine' ? grid[building.y]?.[building.x] : null);
  const knownType =
    realCell && viewer !== 'world'
      ? getKnownCellType(knowledge, realCell.x, realCell.y)
      : realCell?.type;
  const knownRoad =
    realCell && viewer !== 'world'
      ? isKnownRoad(knowledge, realCell.x, realCell.y)
      : !!realCell?.road;
  const cell: Cell | null =
    realCell && knownType
      ? {
          x: realCell.x,
          y: realCell.y,
          type: knownType,
          isWalkable: MOVE_COST[knownType] !== undefined,
          ...(knownRoad && { road: true as const }),
          ...((viewer === 'world'
            ? realCell.rich
            : isKnownRichGold(knowledge, realCell.x, realCell.y)) && {
            rich: true as const,
          }),
        }
      : null;
  const isUnknownCell = !!realCell && !knownType;
  const site =
    cell && !unit && !building
      ? Object.values(
          viewer === 'world' ? worldSites : (knowledge?.sites ?? {}),
        ).find(s => s.x === cell.x && s.y === cell.y)
      : undefined;
  const remembered =
    !!site &&
    viewer !== 'world' &&
    getCellKnowledge(knowledge, site.x, site.y) !== 'visible';

  return { cell, unit, building, isUnknownCell, site, remembered };
};

/**
 * Карточка выбранного: портрет, HP, очки, бонусы.
 * Без выбора не показывается — карта остаётся свободной.
 */
export const SelectionCard = () => {
  const { cell, unit, building, isUnknownCell, site, remembered } =
    useKnownSelection();
  if (!cell && !unit && !building && !isUnknownCell) return null;

  return (
    <aside className={styles.Card} aria-label='Выбранный объект'>
      {isUnknownCell ? (
        <p className={styles.Note}>Клетка не разведана.</p>
      ) : site ? (
        <SelectedSiteInfo site={site} remembered={remembered} />
      ) : (
        <SelectedEntityInfo cell={cell} unit={unit} building={building} />
      )}
    </aside>
  );
};
