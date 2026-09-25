import { EntityPortrait, GoldIcon, WoodIcon } from '@shared/ui';
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
import { useGameLoopSelectors } from '@features/game-loop';
import { getPayableResources, useDebugException } from '@entities/settings';
import styles from './OptionCards.styles.module.css';

/** Где искать подсвеченную клетку для зданий с особым требованием к местности. */
const PLACE: Partial<Record<CellType, string>> = {
  gold: 'на золотой жиле',
  forest: 'в лесу',
};

export const WorkerBuildOptions = ({ unit }: { unit: Unit }) => {
  const { resources } = useEconomySelectors();
  const { humanId } = useGameLoopSelectors();
  const { owner } = unit;
  const isFree = useDebugException(owner, 'freeBuild');
  const payable = getPayableResources(resources[owner], isFree);
  const {
    selectedBuildingForSpawn,
    selectBuildingForSpawn,
    clearSelectedBuildingForSpawn,
  } = useBuildingsSelectors();

  const { calculateActionHighlights, resetStore: clearMovement } =
    useMovementStore();

  const {
    buildableCells,
    calculateBuildableCells,
    resetStore: clearHighlight,
  } = useHighlightStore();

  const isOwnUnit = unit.owner === humanId;
  const isWorker = unit.type === 'worker' && unit.role === 'civil';

  if (!isOwnUnit || !isWorker) return null;

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
      // После отмены строительства снова показываем клетки для движения.
      calculateActionHighlights(unit.id);
    } else {
      selectBuildingForSpawn(buildingType);
      calculateBuildableCells(unit.id, requiredField);
    }
  };

  const selected = buildableTypes.find(
    type => type === selectedBuildingForSpawn,
  );
  const selectedField = selected && BUILDINGS_CONFIG[selected].requiredField;
  const place =
    selectedField && PLACE[selectedField] ? ` ${PLACE[selectedField]}` : '';

  return (
    <section className={styles.Section}>
      <header className={styles.Header}>
        <h4 className={styles.Title}>Построить здание</h4>
        <span
          className={styles.Points}
          data-empty={unit.buildPoints <= 0}
          title='Очки строительства рабочего на этот ход'
        >
          Стройка: {unit.buildPoints} / {unit.maxBuildPoints}
        </span>
      </header>

      {selected && (
        <p className={styles.Prompt} role='status'>
          {buildableCells?.length
            ? `Кликните по подсвеченной клетке${place}, чтобы построить «${BUILDINGS_NAME[selected]}».`
            : `Рядом с рабочим нет свободной клетки${place}: подведите его ближе.`}{' '}
          Повторный клик по карточке отменит выбор.
        </p>
      )}

      <div className={styles.List}>
        {buildableTypes.map(buildingType => {
          const { cost, requiredField } = BUILDINGS_CONFIG[buildingType];
          const name = BUILDINGS_NAME[buildingType];

          const check = canSpawnBuilding(
            buildingType,
            payable,
            unit.buildPoints,
          );

          const infoText = getBuildingInfoText(buildingType);

          return (
            <button
              key={buildingType}
              className={styles.Card}
              disabled={!check.canSpawn}
              onClick={() => onClick(buildingType, requiredField)}
              aria-pressed={selectedBuildingForSpawn === buildingType}
              title={[check.message, infoText].filter(Boolean).join('. ')}
            >
              <EntityPortrait type={buildingType} owner={unit.owner} />
              <span className={styles.Content}>
                <span className={styles.Name}>
                  {name}
                  {isFree && ' · бесплатно (отладка)'}
                </span>
                <span className={styles.Costs}>
                  <span
                    className={styles.Cost}
                    data-lacking={payable.gold < cost.gold}
                  >
                    <GoldIcon /> {isFree ? 0 : cost.gold} золота
                  </span>
                  {cost.wood === 0 ? null : (
                    <span
                      className={styles.Cost}
                      data-lacking={payable.wood < cost.wood}
                    >
                      <WoodIcon /> {isFree ? 0 : cost.wood} дерева
                    </span>
                  )}
                </span>
                {infoText && <span className={styles.Info}>{infoText}</span>}
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
