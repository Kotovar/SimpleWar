import {
  BUILDINGS_CONFIG,
  BUILDINGS_NAME,
  BuildingType,
  CellType,
  Unit,
} from '@shared/config';
import { canSpawnBuilding, getBuildingInfoText } from '@shared/lib';
import { useEconomySelectors } from '@entities/economies';
import { useBuildingsSelectors } from '@entities/buildings';
import { useHighlightStore, useMovementStore } from '@features/pathfinding';
import styles from './WorkerBuildOptions.styles.module.css';

export const WorkerBuildOptions = ({ unit }: { unit: Unit }) => {
  const { resources } = useEconomySelectors();
  const {
    selectedBuildingForSpawn,
    selectBuildingForSpawn,
    clearSelectedBuildingForSpawn,
  } = useBuildingsSelectors();

  const { calculateMovement, resetStore: clearMovement } = useMovementStore();

  const { calculateBuildableCells, resetStore: clearHighlight } =
    useHighlightStore();

  const isPlayerUnit = unit.owner === 'player';
  const isWorker = unit.type === 'worker' && unit.role === 'civil';

  if (!isPlayerUnit || !isWorker) return null;

  const buildableTypes = unit.buildableBuildings;
  if (buildableTypes.length === 0) return null;

  const onClick = (
    buildingType: BuildingType,
    requiredField: CellType = 'grass',
  ) => {
    if (unit.buildPoints <= 0) return;
    clearHighlight();
    clearMovement();

    if (selectedBuildingForSpawn === buildingType) {
      clearSelectedBuildingForSpawn();
      calculateMovement(unit.id);
    } else {
      selectBuildingForSpawn(buildingType);

      if (requiredField) {
        calculateBuildableCells(unit.id, requiredField);
      }
    }
  };

  return (
    <div className={styles.BuildSection}>
      <h4 className={styles.BuildHeader}>Построить здание</h4>

      <div className={styles.BuildButtons}>
        {buildableTypes.map(buildingType => {
          const { cost, requiredField } = BUILDINGS_CONFIG[buildingType];
          const name = BUILDINGS_NAME[buildingType];

          const check = canSpawnBuilding(
            buildingType,
            resources.player,
            unit.buildPoints,
          );

          const infoText = getBuildingInfoText(buildingType);

          return (
            <button
              key={buildingType}
              className={styles.BuildButton}
              disabled={!check.canSpawn}
              onClick={() => onClick(buildingType, requiredField)}
              title={check.message}
            >
              {name}
              <small className={styles.Cost}>🪙{cost.gold} золота</small>
              {cost.wood === 0 ? null : (
                <small className={styles.Cost}>🌳{cost.wood} дерева</small>
              )}
              {infoText && (
                <small className={styles.InfoText}>{infoText}</small>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
