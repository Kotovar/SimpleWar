import { EntityPortrait, GoldIcon, PopulationIcon, WoodIcon } from '@shared/ui';
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
import styles from './OptionCards.styles.module.css';

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

  const {
    spawnableCells,
    calculateSpawnableCells,
    resetStore: resetHighlightedCells,
  } = useHighlightStore();

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
      calculateSpawnableCells(building.id, requiredField);
    }
  };

  const selected = spawningTypes.find(type => type === selectedUnitForSpawn);

  return (
    <section className={styles.Section}>
      <header className={styles.Header}>
        <h4 className={styles.Title}>Нанять юнита</h4>
        <span
          className={styles.Points}
          data-empty={building.spawnPoints <= 0}
          title='Сколько юнитов здание может выпустить за этот ход'
        >
          Найм: {building.spawnPoints} / {building.maxSpawnPoints}
        </span>
      </header>

      {selected && (
        <p className={styles.Prompt} role='status'>
          {spawnableCells?.length
            ? `Кликните по подсвеченной клетке рядом со зданием, чтобы нанять «${UNITS_NAME[selected]}».`
            : 'Вокруг здания нет свободной клетки для нового юнита.'}{' '}
          Повторный клик по карточке отменит выбор.
        </p>
      )}

      <div className={styles.List}>
        {spawningTypes.map(spawnType => {
          const config = UNITS_CONFIG[spawnType];
          const { cost, requiresLimit } = config;
          const name = UNITS_NAME[spawnType];

          const check = canSpawnUnit(
            spawnType,
            resources.player,
            populationCap.player,
            building.spawnPoints,
          );

          const { occupied, max } = populationCap.player;
          const stats = [
            `${config.maxHp} HP`,
            'attack' in config && `урон ${config.attack}`,
            'attackRange' in config && `дальность ${config.attackRange}`,
            `ход ${config.maxMovePoints}`,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <button
              key={spawnType}
              className={styles.Card}
              disabled={!check.canSpawn}
              onClick={() => onClick(spawnType)}
              aria-pressed={selectedUnitForSpawn === spawnType}
              title={[check.message, stats].filter(Boolean).join('. ')}
            >
              <EntityPortrait type={spawnType} owner={building.owner} />
              <span className={styles.Content}>
                <span className={styles.Name}>{name}</span>
                <span className={styles.Costs}>
                  <span
                    className={styles.Cost}
                    data-lacking={resources.player.gold < cost.gold}
                  >
                    <GoldIcon /> {cost.gold} золота
                  </span>
                  {cost.wood === 0 ? null : (
                    <span
                      className={styles.Cost}
                      data-lacking={resources.player.wood < cost.wood}
                    >
                      <WoodIcon /> {cost.wood} дерева
                    </span>
                  )}
                  <span
                    className={styles.Cost}
                    data-kind='population'
                    data-lacking={occupied + requiresLimit > max}
                  >
                    <PopulationIcon /> {requiresLimit}{' '}
                    {requiresLimit === 1 ? 'слот' : 'слота'}
                  </span>
                </span>
                <span className={styles.Info}>{stats}</span>
                {!check.canSpawn && (
                  <span className={styles.Reason}>{check.message}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
