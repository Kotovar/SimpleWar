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

export const SelectedEntityInfo = ({ cell, unit, building }: Props) => {
  if (!cell && !unit && !building) return null;
  const entity = unit || building;

  return (
    <section className={styles.EntityInfo}>
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

      {entity && (
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
      )}

      <dl className={styles.EntityDetails}>
        {cell && (
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
                className={
                  cell.isWalkable ? styles.IsWalkable : styles.IsNotWalkable
                }
              >
                {cell.isWalkable ? 'Проходима' : 'Непроходима'}
              </dd>
            </div>
          </>
        )}
        {unit && (
          <>
            <div>
              <dt>Движение</dt>
              <dd className={styles.MovePoints}>
                {unit.movePoints} / {unit.maxMovePoints}
              </dd>
            </div>
            {unit.role !== 'civil' && (
              <>
                <div>
                  <dt>Атаки</dt>
                  <dd className={styles.AttackPoints}>
                    {unit.attackPoints} / {unit.maxAttackPoints}
                  </dd>
                </div>
                <div>
                  <dt>Радиус атаки</dt>
                  <dd>{unit.attackRange}</dd>
                </div>
                <div>
                  <dt>Урон</dt>
                  <dd>{unit.attack}</dd>
                </div>
              </>
            )}
            {unit.role === 'civil' && (
              <div>
                <dt>Очки строительства</dt>
                <dd className={styles.BuildPoints}>
                  {unit.buildPoints} / {unit.maxBuildPoints}
                </dd>
              </div>
            )}
          </>
        )}
        {building?.role === 'production' && (
          <div>
            <dt>Очки производства</dt>
            <dd className={styles.BuildPoints}>
              {building.spawnPoints} / {building.maxSpawnPoints}
            </dd>
          </div>
        )}
        {building?.role === 'combat' && (
          <>
            <div>
              <dt>Атаки</dt>
              <dd className={styles.AttackPoints}>
                {building.attackPoints} / {building.maxAttackPoints}
              </dd>
            </div>
            <div>
              <dt>Радиус атаки</dt>
              <dd>{building.attackRange}</dd>
            </div>
            <div>
              <dt>Урон</dt>
              <dd>{building.attack}</dd>
            </div>
          </>
        )}
      </dl>
    </section>
  );
};
