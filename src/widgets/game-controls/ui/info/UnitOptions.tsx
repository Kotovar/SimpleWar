import { useState } from 'react';
import { EntityPortrait, GoldIcon, PopulationIcon, WoodIcon } from '@shared/ui';
import {
  HEALING,
  SIEGE_STRIKE,
  UNITS_CONFIG,
  UNITS_NAME,
  type Building,
  type CellType,
  type UnitType,
} from '@shared/config';
import { canSpawnUnit, getCombatProfile } from '@shared/lib';
import { DamageBadges, DefenseBadges, FlightBadge } from './CombatBadges';
import { useUnitsSelectors } from '@entities/units';
import { useEconomySelectors } from '@entities/economies';
import { useHighlightStore } from '@features/pathfinding';
import { useGameLoopSelectors } from '@features/game-loop';
import { getPayableResources, useDebugException } from '@entities/settings';
import styles from './OptionCards.styles.module.css';

type Props = {
  building: Building;
};

/** Есть ли у типа защита, которую стоит показать. */
const hasDefense = (type: UnitType) => {
  const { armor, magicResist } = getCombatProfile(type);
  return armor + magicResist > 0;
};

export const UnitOptions = ({ building }: Props) => {
  const [showDetails, setShowDetails] = useState(false);
  const { resources, populationCap } = useEconomySelectors();
  const { humanId } = useGameLoopSelectors();
  const { owner } = building;
  const isFree = useDebugException(owner, 'freeSpawn');
  const payable = getPayableResources(resources[owner], isFree);

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
  const isOwnBuilding = building.owner === humanId;
  if (!canSpawn || !isOwnBuilding) return null;

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
    <section className={styles.Section} data-details={showDetails}>
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

      <button
        type='button'
        className={styles.DetailsToggle}
        aria-pressed={showDetails}
        onClick={() => setShowDetails(value => !value)}
      >
        {showDetails ? 'Скрыть характеристики' : 'Показать характеристики'}
      </button>

      <div className={styles.List}>
        {spawningTypes.map(spawnType => {
          const config = UNITS_CONFIG[spawnType];
          const { cost, requiresLimit } = config;
          const name = UNITS_NAME[spawnType];

          const check = canSpawnUnit(
            spawnType,
            payable,
            populationCap[owner],
            building.spawnPoints,
          );

          const { occupied, max } = populationCap[owner];
          const heal = HEALING[spawnType]?.amount;
          const range =
            spawnType === 'siege'
              ? `${SIEGE_STRIKE.minRange}–${SIEGE_STRIKE.maxRange}`
              : 'attackRange' in config && config.attackRange;
          const stats = [
            `${config.maxHp} HP`,
            heal
              ? `лечение +${heal} HP`
              : 'attack' in config && `урон ${config.attack}`,
            range && `дальность ${range}`,
            `ход ${config.maxMovePoints}`,
          ]
            .filter(Boolean)
            .join(' · ');
          const damage = 'attack' in config && !heal && (
            <>
              урон {config.attack}
              <DamageBadges type={spawnType} />
            </>
          );

          return (
            <button
              key={spawnType}
              className={styles.Card}
              disabled={!check.canSpawn}
              onClick={() => onClick(spawnType)}
              aria-pressed={selectedUnitForSpawn === spawnType}
              title={[check.message, stats].filter(Boolean).join('. ')}
            >
              <EntityPortrait
                type={spawnType}
                owner={building.owner}
                size={32}
              />
              <span className={styles.Content}>
                <span className={styles.Name}>
                  {name}
                  {isFree && ' · бесплатно (отладка)'}
                </span>
                <span className={styles.Costs}>
                  <span
                    className={styles.Cost}
                    aria-label={`${isFree ? 0 : cost.gold} золота`}
                    data-lacking={payable.gold < cost.gold}
                  >
                    <GoldIcon /> {isFree ? 0 : cost.gold}
                  </span>
                  {cost.wood === 0 ? null : (
                    <span
                      className={styles.Cost}
                      aria-label={`${isFree ? 0 : cost.wood} дерева`}
                      data-lacking={payable.wood < cost.wood}
                    >
                      <WoodIcon /> {isFree ? 0 : cost.wood}
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
                <span className={styles.Info}>
                  {config.maxHp} HP{damage && <> · {damage}</>}
                  {heal && ` · лечение +${heal} HP`}
                  {range && ` · дальность ${range}`} · ход{' '}
                  {config.maxMovePoints}
                  <FlightBadge type={spawnType} />
                  {hasDefense(spawnType) && (
                    <>
                      {' '}
                      · защита
                      <DefenseBadges type={spawnType} />
                    </>
                  )}
                </span>
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
