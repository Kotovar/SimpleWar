import {
  BUILDINGS_NAME,
  PALETTES,
  TERRAIN_NAME,
  UNITS_NAME,
  HEALING,
  SIEGE_STRIKE,
  RICH_MINE_INCOME,
  type Building,
  type Cell,
  type Unit,
} from '@shared/config';
import { EntityPortrait, TerrainPortrait } from '@shared/ui';
import { getCombatProfile, getMoveCost, getRelation } from '@shared/lib';
import { useGameLoopSelectors } from '@features/game-loop';
import { getOrderStopMessage } from '@features/pathfinding';
import { useUnitsStore } from '@entities/units';
import { useParticipantPalette } from '@entities/games';
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
  const { humanId, participants } = useGameLoopSelectors();
  const entity = unit ?? building;
  const palette = useParticipantPalette(entity?.owner ?? 'p1');
  return (
    <div className={styles.EntityHeader}>
      {entity ? (
        <EntityPortrait
          type={entity.type}
          owner={entity.owner}
          palette={palette}
          size={64}
        />
      ) : (
        cell && <TerrainPortrait cell={cell} size={64} />
      )}
      <div>
        <h3 className={styles.EntityName}>
          {unit
            ? UNITS_NAME[unit.type]
            : building
              ? BUILDINGS_NAME[building.type]
              : cell && (cell.rich ? 'Богатая жила' : TERRAIN_NAME[cell.type])}
        </h3>
        {entity && (
          <span className={styles.Owner} data-owner={entity.owner}>
            Владелец: {entity.owner === humanId ? 'Вы' : PALETTES[palette].name}
            {humanId &&
              getRelation(humanId, entity.owner, participants) === 'allied' &&
              ' · Союзник'}
          </span>
        )}
        {cell && entity && (
          <span className={styles.Owner}>
            {cell.rich ? 'Богатая жила' : TERRAIN_NAME[cell.type]}
          </span>
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
    {cell.rich && (
      <div>
        <dt>Рудник с рабочим</dt>
        <dd>+{RICH_MINE_INCOME} золота/ход</dd>
      </div>
    )}
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
          ? `${cell.road ? 'Дорога' : 'Проходима'}, ход ${getMoveCost(cell)} ${getMoveCost(cell) === 1 ? 'очко' : 'очка'}`
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
 * Прибавка Строя к броне своего копейщика сейчас. Чужому считаем только
 * после партии: во время игры его соседи могут быть под туманом.
 */
const useFormationBonus = (unit: Unit) => {
  const { humanId, phase } = useGameLoopSelectors();
  const units = useUnitsStore(state => state.units);
  const learned = useResearchStore(
    state => !!state.completed[unit.owner]?.includes('formation'),
  );
  if (!learned || (unit.owner !== humanId && phase !== 'gameOver')) return 0;
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
    {unit.concealed && (
      <div>
        <dt>Маскировка</dt>
        <dd title='Движение, атака или враг вплотную снимают маскировку.'>
          <svg
            width='14'
            height='14'
            viewBox='0 0 16 16'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            aria-hidden='true'
          >
            <path d='M1 8Q8 0 15 8Q8 16 1 8M2 2L14 14' />
          </svg>{' '}
          Скрыт
        </dd>
      </div>
    )}
    {unit.order && (
      <div>
        <dt>Приказ</dt>
        <dd>
          {unit.order.stopped
            ? `Остановлен: ${getOrderStopMessage(unit.order.stopped)}`
            : unit.order.type === 'explore'
              ? 'Авторазведка'
              : unit.order.type === 'work'
                ? 'Работать'
                : unit.order.type === 'build'
                  ? `Построить: ${BUILDINGS_NAME[unit.order.buildingType]}`
                  : unit.order.type === 'road'
                    ? 'Проложить дорогу'
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

const BuildingDetails = ({
  building,
  own,
  canCommand,
  currentTurn,
}: {
  building: Building;
  own: boolean;
  canCommand: boolean;
  currentTurn: number;
}) => (
  <>
    <DefenseRow type={building.type} />
    {building.type === 'outpost' && building.role === 'supply' && (
      <>
        <div>
          <dt>Обзор</dt>
          <dd>{building.sightRange}</dd>
        </div>
        <div>
          <dt>Доход</dt>
          <dd>+{building.income?.gold ?? 0} золота / ход</dd>
        </div>
        <div>
          <dt>Население</dt>
          <dd>+{building.populationSupply}</dd>
        </div>
      </>
    )}
    {building.type === 'beacon' && (
      <div>
        <dt>Костёр</dt>
        <dd>
          Обзор {building.sightRange} · погаснет в круге {building.expiresTurn}{' '}
          (через{' '}
          {Math.max(0, (building.expiresTurn ?? currentTurn) - currentTurn)})
        </dd>
      </div>
    )}
    {building.role === 'production' && (
      <div>
        <dt>Очки производства</dt>
        <dd className={styles.BuildPoints}>
          {building.spawnPoints} / {building.maxSpawnPoints}
        </dd>
      </div>
    )}
    {own && building.role === 'production' && (
      <div>
        <dt>Точка сбора</dt>
        <dd>
          {building.rallyPoint
            ? `${building.rallyPoint.x + 1}, ${building.rallyPoint.y + 1}`
            : 'Не задана'}
          {canCommand && ' · «Задать точку сбора» (T)'}
        </dd>
      </div>
    )}
    {building.role === 'combat' && <AttackDetails entity={building} />}
  </>
);

export const SelectedEntityInfo = ({ cell, unit, building }: Props) => {
  const { humanId, phase, currentTurn } = useGameLoopSelectors();
  const entity = unit ?? building;
  const palette = useParticipantPalette(entity?.owner ?? 'p1');
  if (!cell && !entity) return null;

  return (
    <section
      className={styles.EntityInfo}
      data-owner={entity?.owner}
      style={
        entity ? { ['--owner' as string]: PALETTES[palette].color } : undefined
      }
    >
      <EntityHeader cell={cell} unit={unit} building={building} />
      {entity && <EntityHealth entity={entity} />}
      <dl className={styles.EntityDetails}>
        {cell && <CellDetails cell={cell} />}
        {unit && <UnitDetails unit={unit} />}
        {building && (
          <BuildingDetails
            building={building}
            own={building.owner === humanId}
            currentTurn={currentTurn}
            canCommand={phase === 'inProgress'}
          />
        )}
      </dl>
    </section>
  );
};
