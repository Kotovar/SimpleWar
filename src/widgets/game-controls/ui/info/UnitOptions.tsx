import { GoldIcon, PopulationIcon, WoodIcon } from '@shared/ui';
import {
  UNITS_CONFIG,
  UNITS_NAME,
  type Building,
  type CellType,
  type UnitType,
} from '@shared/config';
import { canSpawnUnit } from '@shared/lib';
import { useUnitsSelectors } from '@entities/units';
import { useEconomySelectors } from '@entities/economies';
import { useHighlightStore } from '@features/pathfinding';
import styles from './UnitOptions.styles.module.css';
import { getUnitInfoText } from '@shared/lib/getUnitInfoText';

type Props = {
  building: Building;
};

export const UnitOptions = ({ building }: Props) => {
  const { resources, populationCap } = useEconomySelectors();

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

  const onClick = (spawnType: UnitType, requiredField: CellType = 'grass') => {
    if (building.spawnPoints <= 0) return;
    resetHighlightedCells();

    if (selectedUnitForSpawn === spawnType) {
      clearSelectedUnitForSpawn();
    } else {
      selectUnitForSpawn(spawnType);

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
          const { cost, requiresLimit } = UNITS_CONFIG[spawnType];
          const name = UNITS_NAME[spawnType];

          const check = canSpawnUnit(
            spawnType,
            resources.player,
            populationCap.player,
            building.spawnPoints,
          );

          const infoText = getUnitInfoText(spawnType);

          return (
            <button
              key={spawnType}
              className={styles.UnitButton}
              disabled={!check.canSpawn}
              onClick={() => onClick(spawnType, 'grass')}
              aria-pressed={selectedUnitForSpawn === spawnType}
              title={[check.message, infoText].filter(Boolean).join('. ')}
            >
              <span className={styles.Name}>{name}</span>

              <small className={styles.Cost}>
                <GoldIcon /> {cost.gold} золота
              </small>

              {cost.wood === 0 ? null : (
                <small className={styles.Cost}>
                  <WoodIcon /> {cost.wood} дерева
                </small>
              )}

              <small className={styles.PopCost}>
                <PopulationIcon /> {requiresLimit}{' '}
                {requiresLimit === 1 ? 'слот' : 'слота'} населения
              </small>
              {selectedUnitForSpawn === spawnType && infoText && (
                <small className={styles.InfoText}>{infoText}</small>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
