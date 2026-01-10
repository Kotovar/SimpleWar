import {
  BUILDINGS_NAME,
  OWNER_NAME,
  TERRAIN_NAME,
  UNITS_NAME,
  type Building,
  type Cell,
  type Unit,
} from '@shared/config';
import styles from './SelectedEntityInfo.styles.module.css';

type Props = {
  cell: Cell | null;
  unit: Unit | null;
  building: Building | null;
};

export const SelectedEntityInfo = ({ cell, unit, building }: Props) => {
  if (!cell && !unit && !building) return null;

  return (
    <section className={styles.EntityInfo}>
      <div className={styles.EntityHeader}>
        {unit && (
          <>
            <span className={styles.EntityIcon}>⚔️</span>
            <span>{UNITS_NAME[unit.type]}</span>
          </>
        )}
        {building && (
          <>
            <span className={styles.EntityIcon}>🏰</span>
            <span>{BUILDINGS_NAME[building.type]}</span>
          </>
        )}
        {cell && (
          <>
            <span className={styles.EntityIcon}>🌍</span>
            <span>Клетка</span>
          </>
        )}
      </div>

      <div className={styles.EntityDetails}>
        {cell && (
          <>
            <div>
              Координаты: ({cell.x}, {cell.y})
            </div>
            <div>Тип: {TERRAIN_NAME[cell.type]}</div>
            <div>
              Проходимость:{' '}
              {cell.isWalkable ? (
                <span className={styles.IsWalkable}>Проходима</span>
              ) : (
                <span className={styles.IsNotWalkable}>Непроходима</span>
              )}
            </div>
          </>
        )}

        {(unit || building) && (
          <div>Владелец: {OWNER_NAME[(unit || building)!.owner]}</div>
        )}

        {(unit || building) && (
          <div>
            Здоровье:{' '}
            <span className={styles.HP}>
              {(unit || building)!.hp} / {(unit || building)!.maxHp}
            </span>
          </div>
        )}

        {unit && (
          <>
            <div>
              Движение:{' '}
              <span className={styles.MovePoints}>
                {unit.movePoints} / {unit.maxMovePoints}
              </span>
            </div>

            {unit.role !== 'civil' && (
              <>
                <div>
                  Атаки:{' '}
                  <span className={styles.AttackPoints}>
                    {unit.attackPoints} / {unit.maxAttackPoints}
                  </span>
                </div>
                <div>Радиус атаки: {unit.attackRange}</div>
                <div>Урон: {unit.attack}</div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
};
