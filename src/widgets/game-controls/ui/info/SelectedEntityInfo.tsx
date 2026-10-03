import {
  BUILDINGS_NAME,
  OWNER_NAME,
  TERRAIN_NAME,
  UNITS_NAME,
  HEALING,
  SIEGE_STRIKE,
  type Building,
  type Cell,
  type Unit,
} from '@shared/config';
import { EntityPortrait, TerrainPortrait } from '@shared/ui';
import { getCombatProfile, getMoveCost } from '@shared/lib';
import { useGameLoopSelectors } from '@features/game-loop';
import { getOrderStopMessage } from '@features/pathfinding';
import { useUnitsStore } from '@entities/units';
import { getResearchArmor, useResearchStore } from '@entities/researches';
import { DamageBadges, DefenseBadges, FlightBadge } from './CombatBadges';
import styles from './SelectedEntityInfo.styles.module.css';

type Props = {
  cell: Cell | null;
  unit: Unit | null;
  building: Building | null;
};

type Entity = Unit | Building;
type AttackStats = Pick<
  Extract<Unit, { role: 'military' }> | Extract<Building, { role: 'combat' }>,
  'attackPoints' | 'maxAttackPoints' | 'attackRange' | 'attack' | 'type'
>;

const EntityHeader = ({ cell, unit, building }: Props) => {
  const { humanId } = useGameLoopSelectors();
  const entity = unit ?? building;
  return (
    <div className={styles.EntityHeader}>
      {entity ? (
        <EntityPortrait type={entity.type} owner={entity.owner} size={64} />
      ) : (
        cell && <TerrainPortrait cell={cell} size={64} />
      )}
      <div>
        <h3 className={styles.EntityName}>
          {unit
            ? UNITS_NAME[unit.type]
            : building
              ? BUILDINGS_NAME[building.type]
              : 'Клетка'}
        </h3>
        {entity && (
          <span className={styles.Owner} data-owner={entity.owner}>
            Владелец:{' '}
            {entity.owner === humanId ? 'Вы' : OWNER_NAME[entity.owner]}
          </span>
        )}
        {cell && (
          <span className={styles.Owner}>{TERRAIN_NAME[cell.type]}</span>
        )}
      </div>
    </div>
  );
};

const EntityHealth = ({ entity }: { entity: Entity }) => (
  <div>
    <div className={styles.HealthLabel}>
      <span>Здоровье</span>
      <strong className={styles.HP}>
        {entity.hp} / {entity.maxHp}
      </strong>
    </div>
    <meter
      className={styles.HealthBar}
      min={0}
      max={entity.maxHp}
      low={entity.maxHp * 0.3}
      high={entity.maxHp * 0.6}
      optimum={entity.maxHp}
      value={entity.hp}
      aria-label='Здоровье'
      aria-valuetext={`${entity.hp} из ${entity.maxHp}`}
    />
  </div>
);

const CellDetails = ({ cell }: { cell: Cell }) => (
  <>
    <div>
      <dt>Координаты</dt>
      <dd>
        ({cell.x}, {cell.y})
      </dd>
    </div>
    <div>
      <dt>Проходимость</dt>
      <dd
        className={cell.isWalkable ? styles.IsWalkable : styles.IsNotWalkable}
      >
        {cell.isWalkable
          ? `Проходима, ход ${getMoveCost(cell)} ${getMoveCost(cell) === 1 ? 'очко' : 'очка'}`
          : 'Непроходима'}
      </dd>
    </div>
  </>
);

const AttackDetails = ({ entity }: { entity: AttackStats }) => {
  const heal = HEALING[entity.type as keyof typeof HEALING];
  // Лекарь не атакует: его боевое действие — лечение.
  if (heal) {
    return (
      <>
        <div>
          <dt>Лечения</dt>
          <dd className={styles.AttackPoints}>
            {entity.attackPoints} / {entity.maxAttackPoints}
          </dd>
        </div>
        <div>
          <dt>Дальность лечения</dt>
          <dd>{entity.attackRange}</dd>
        </div>
        <div>
          <dt>Лечение</dt>
          <dd>+{heal.amount} HP</dd>
        </div>
      </>
    );
  }
  return <AttackStatsList entity={entity} />;
};

const AttackStatsList = ({ entity }: { entity: AttackStats }) => (
  <>
    <div>
      <dt>Атаки</dt>
      <dd className={styles.AttackPoints}>
        {entity.attackPoints} / {entity.maxAttackPoints}
      </dd>
    </div>
    <div>
      <dt>Радиус атаки</dt>
      <dd>
        {entity.type === 'siege'
          ? `${SIEGE_STRIKE.minRange}–${SIEGE_STRIKE.maxRange}`
          : entity.attackRange}
      </dd>
    </div>
    <div>
      <dt>Урон</dt>
      <dd>
        {entity.attack}
        <DamageBadges type={entity.type} />
      </dd>
    </div>
    {entity.type === 'siege' && (
      <div>
        <dt>Особенности</dt>
        <dd>заряжаемый удар</dd>
      </div>
    )}
  </>
);

/**
 * Прибавка Строя к броне своего копейщика сейчас. Чужому не считаем: его
 * соседи могут быть под туманом.
 */
const useFormationBonus = (unit: Unit) => {
  const { humanId } = useGameLoopSelectors();
  const units = useUnitsStore(state => state.units);
  const learned = useResearchStore(
    state => !!state.completed[unit.owner]?.includes('formation'),
  );
  if (!learned || unit.owner !== humanId) return 0;
  return getResearchArmor(unit, Object.values(units));
};

/** Защита от физического и магического урона и прибавка Строя, если есть. */
const DefenseRow = ({
  type,
  bonus = 0,
}: {
  type: Unit['type'] | Building['type'];
  bonus?: number;
}) =>
  getCombatProfile(type).armor + getCombatProfile(type).magicResist + bonus >
  0 ? (
    <div>
      <dt>Защита</dt>
      <dd>
        <DefenseBadges type={type} />
        {bonus > 0 && ` (+${bonus} — строй)`}
      </dd>
    </div>
  ) : null;

const UnitDefense = ({ unit }: { unit: Unit }) => (
  <DefenseRow type={unit.type} bonus={useFormationBonus(unit)} />
);

const UnitDetails = ({ unit }: { unit: Unit }) => (
  <>
    {unit.order && (
      <div>
        <dt>Приказ</dt>
        <dd>
          {unit.order.stopped
            ? `Остановлен: ${getOrderStopMessage(unit.order.stopped)}`
            : 'Идти в точку'}
        </dd>
      </div>
    )}
    {unit.restMode && (
      <div>
        <dt>Режим</dt>
        <dd>
          {unit.restMode === 'sleep'
            ? 'Сон — до пробуждения'
            : 'Пропуск — до следующего своего хода'}
        </dd>
      </div>
    )}
    <div>
      <dt>Движение</dt>
      <dd className={styles.MovePoints}>
        {unit.movePoints} / {unit.maxMovePoints}
        <FlightBadge type={unit.type} />
      </dd>
    </div>
    <UnitDefense unit={unit} />
    {unit.role === 'civil' ? (
      <div>
        <dt>Очки строительства</dt>
        <dd className={styles.BuildPoints}>
          {unit.buildPoints} / {unit.maxBuildPoints}
        </dd>
      </div>
    ) : (
      <AttackDetails entity={unit} />
    )}
  </>
);

const BuildingDetails = ({ building }: { building: Building }) => (
  <>
    <DefenseRow type={building.type} />
    {building.role === 'production' && (
      <div>
        <dt>Очки производства</dt>
        <dd className={styles.BuildPoints}>
          {building.spawnPoints} / {building.maxSpawnPoints}
        </dd>
      </div>
    )}
    {building.role === 'combat' && <AttackDetails entity={building} />}
  </>
);

export const SelectedEntityInfo = ({ cell, unit, building }: Props) => {
  const entity = unit ?? building;
  if (!cell && !entity) return null;

  return (
    <section className={styles.EntityInfo} data-owner={entity?.owner}>
      <EntityHeader cell={cell} unit={unit} building={building} />
      {entity && <EntityHealth entity={entity} />}
      <dl className={styles.EntityDetails}>
        {cell && <CellDetails cell={cell} />}
        {unit && <UnitDetails unit={unit} />}
        {building && <BuildingDetails building={building} />}
      </dl>
    </section>
  );
};
