import { useState } from 'react';
import {
  BUILDINGS_CONFIG,
  BUILDINGS_NAME,
  BuildingType,
  CellType,
  CIVIL_UNITS_CONFIG,
  Unit,
} from '@shared/config';
import { useEconomySelectors } from '@entities/economies';
import { useMovementStore } from '@features/pathfinding';
import styles from './WorkerBuildOptions.styles.module.css';

export const WorkerBuildOptions = ({ unit }: { unit: Unit }) => {
  const { resources } = useEconomySelectors();
  const [selectedBuildType, setSelectedBuildType] =
    useState<BuildingType | null>(null);

  const {
    calculateMovement,
    calculateBuildableCells,
    resetStore: resetHighlightedCells,
  } = useMovementStore();

  const isWorker = unit.type === 'worker' && unit.role === 'civil';
  if (!isWorker) return null;

  const buildableTypes = CIVIL_UNITS_CONFIG.worker.buildableBuildings;
  if (buildableTypes.length === 0) return null;

  const onClick = (
    name: string,
    buildingType: BuildingType,
    requiredField: CellType = 'grass',
  ) => {
    resetHighlightedCells();

    if (selectedBuildType === buildingType) {
      setSelectedBuildType(null);
      calculateMovement(unit.id);
      console.log(`Отменён режим постройки: ${name}`);
    } else {
      setSelectedBuildType(buildingType);

      if (requiredField) {
        calculateBuildableCells(unit.id, requiredField);
      }
      console.log(`Выбрана постройка: ${name} (${buildingType})`);
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
              onClick={() => onClick(name, buildingType, requiredField)}
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
