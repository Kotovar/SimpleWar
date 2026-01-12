import {
  UNITS_CONFIG,
  UNITS_NAME,
  type Building,
  type CellType,
  type UnitType,
} from '@shared/config';
import { useUnitsSelectors } from '@entities/units';
import { useEconomySelectors } from '@entities/economies';
import { useHighlightStore } from '@features/pathfinding';
import styles from './UnitOptions.styles.module.css';

type Props = {
  building: Building;
};

export const UnitOptions = ({ building }: Props) => {
  const { resources } = useEconomySelectors();

  const {
    selectedUnitForSpawn,
    selectUnitForSpawn,
    clearSelectedUnitForSpawn,
  } = useUnitsSelectors();

  const { calculateSpawnableCells, resetStore: resetHighlightedCells } =
    useHighlightStore();

  const canSpawn = building.role === 'production';
  const isPlayerBuilding = building.owner === 'player';
  if (!canSpawn || !isPlayerBuilding) return null;

  const spawningTypes = building.spawningUnits;
  if (spawningTypes.length === 0) return null;

  const onClick = (
    spawningTypes: UnitType,
    requiredField: CellType = 'grass',
  ) => {
    if (building.spawnPoints <= 0) return;
    resetHighlightedCells();

    if (selectedUnitForSpawn === spawningTypes) {
      clearSelectedUnitForSpawn();
    } else {
      selectUnitForSpawn(spawningTypes);

      if (requiredField) {
        calculateSpawnableCells(building.id, requiredField);
      }
    }
  };

  return (
    <div className={styles.UnitSection}>
      <h4 className={styles.UnitHeader}>Создать юнит</h4>

      <div className={styles.UnitButtons}>
        {spawningTypes.map(spawnType => {
          const config = UNITS_CONFIG[spawnType];
          const cost = config.cost;
          const requiredField = 'grass';
          const name = UNITS_NAME[spawnType];

          const canAfford =
            resources.player.gold >= cost.gold &&
            resources.player.wood >= cost.wood;

          return (
            <button
              key={spawnType}
              className={styles.UnitButton}
              disabled={!canAfford}
              onClick={() => onClick(spawnType, requiredField)}
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
