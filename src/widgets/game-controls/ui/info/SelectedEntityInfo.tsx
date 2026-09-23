import {
  BUILDINGS_NAME,
  OWNER_NAME,
  TERRAIN_NAME,
  UNITS_NAME,
  type Building,
  type Cell,
  type Unit,
} from '@shared/config';
import { EntityPortrait, TerrainIcon } from '@shared/ui';
import styles from './SelectedEntityInfo.styles.module.css';

type Props = {
  cell: Cell | null;
  unit: Unit | null;
  building: Building | null;
};

type Entity = Unit | Building;
type AttackStats = Pick<
  Extract<Unit, { role: 'military' }> | Extract<Building, { role: 'combat' }>,
  'attackPoints' | 'maxAttackPoints' | 'attackRange' | 'attack'
>;

const EntityHeader = ({ cell, unit, building }: Props) => {
  const entity = unit ?? building;
  return (
    <div className={styles.EntityHeader}>
      {entity ? (
        <EntityPortrait type={entity.type} owner={entity.owner} size={64} />
      ) : (
        <TerrainIcon size={32} />
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
            Владелец: {OWNER_NAME[entity.owner]}
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
        {cell.isWalkable ? 'Проходима' : 'Непроходима'}
      </dd>
    </div>
  </>
);

const AttackDetails = ({ entity }: { entity: AttackStats }) => (
  <>
    <div>
      <dt>Атаки</dt>
      <dd className={styles.AttackPoints}>
        {entity.attackPoints} / {entity.maxAttackPoints}
      </dd>
    </div>
    <div>
      <dt>Радиус атаки</dt>
      <dd>{entity.attackRange}</dd>
    </div>
    <div>
      <dt>Урон</dt>
      <dd>{entity.attack}</dd>
    </div>
  </>
);

const UnitDetails = ({ unit }: { unit: Unit }) => (
  <>
    <div>
      <dt>Движение</dt>
      <dd className={styles.MovePoints}>
        {unit.movePoints} / {unit.maxMovePoints}
      </dd>
    </div>
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

const BuildingDetails = ({ building }: { building: Building }) => {
  if (building.role === 'production') {
    return (
      <div>
        <dt>Очки производства</dt>
        <dd className={styles.BuildPoints}>
          {building.spawnPoints} / {building.maxSpawnPoints}
        </dd>
      </div>
    );
  }

  if (building.role === 'combat') return <AttackDetails entity={building} />;
  return null;
};

export const SelectedEntityInfo = ({ cell, unit, building }: Props) => {
  const entity = unit ?? building;
  if (!cell && !entity) return null;

  return (
    <section className={styles.EntityInfo}>
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
