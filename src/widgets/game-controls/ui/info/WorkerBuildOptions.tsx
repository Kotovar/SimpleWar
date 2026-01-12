import {
  BUILDINGS_CONFIG,
  BUILDINGS_NAME,
  BuildingType,
  CellType,
  Unit,
} from '@shared/config';
import { useEconomySelectors } from '@entities/economies';
import { useMovementStore } from '@features/pathfinding';
import styles from './WorkerBuildOptions.styles.module.css';
import { useBuildingsSelectors } from '@entities/buildings';

export const WorkerBuildOptions = ({ unit }: { unit: Unit }) => {
  const { resources } = useEconomySelectors();
  const {
    selectedBuildingForSpawn,
    selectBuildingForSpawn,
    clearSelectedBuildingForSpawn,
  } = useBuildingsSelectors();

  const {
    calculateMovement,
    calculateBuildableCells,
    resetStore: resetHighlightedCells,
  } = useMovementStore();

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
    resetHighlightedCells();

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
          const config = BUILDINGS_CONFIG[buildingType];
          const cost = config.cost;
          const requiredField = config.requiredField;
          const name = BUILDINGS_NAME[buildingType];

          const canAfford =
            resources.player.gold >= cost.gold &&
            resources.player.wood >= cost.wood;

          return (
            <button
              key={buildingType}
              className={styles.BuildButton}
              disabled={!canAfford}
              onClick={() => onClick(buildingType, requiredField)}
            >
              {name}
              <small>
                {cost.gold} зол. : {cost.wood} дер.
              </small>
            </button>
          );
        })}
      </div>
    </div>
  );
};
