import { useState, type ReactNode } from 'react';
import type { Building, BuildingType, Unit } from '@shared/config';
import {
  findServingWorker,
  getAvailableResources,
  getReservedResources,
} from '@shared/lib';
import { useBuildingsSelectors } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useResearchStore } from '@entities/researches';
import { useEconomySelectors } from '@entities/economies';
import { calculateIncome, useGameLoopSelectors } from '@features/game-loop';
import { GoldIcon, PopulationIcon, WoodIcon } from '@shared/ui';
import { ResearchStat } from './ResearchStat';
import styles from './ResourcesInfo.styles.module.css';

type StatProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  extra?: ReactNode;
  /**
   * Предупреждение значком в углу, например о простое добычи: не меняет
   * размеры плашки, подробности — в подсказке.
   */
  warning?: { count: number; text: string; title: string };
  tone: 'gold' | 'wood' | 'population';
  /** Запас числом: его изменение всплывает над плашкой. */
  amount?: number;
};

/**
 * Всплывающее «+3» / «−40» при изменении запаса. Прежнее значение хранится
 * в состоянии и сверяется при рендере — без эффекта и лишнего кадра.
 */
const Delta = ({ amount }: { amount: number }) => {
  const [previous, setPrevious] = useState(amount);
  const [delta, setDelta] = useState<{ id: number; diff: number } | null>(null);
  if (amount !== previous) {
    setPrevious(amount);
    setDelta({ id: (delta?.id ?? 0) + 1, diff: amount - previous });
  }
  if (!delta) return null;
  return (
    <span
      key={delta.id}
      className={styles.Delta}
      data-sign={delta.diff > 0 ? 'plus' : 'minus'}
      aria-hidden
      onAnimationEnd={() => setDelta(null)}
    >
      {delta.diff > 0 ? `+${delta.diff}` : `−${-delta.diff}`}
    </span>
  );
};

const Stat = ({
  icon,
  label,
  value,
  extra,
  warning,
  tone,
  amount,
}: StatProps) => (
  <div className={styles.Stat} data-tone={tone}>
    {amount !== undefined && <Delta amount={amount} />}
    <span className={styles.Icon}>{icon}</span>
    <span className={styles.Body}>
      <span className={styles.Label}>{label}</span>
      <span className={styles.Value}>
        {value}
        {extra && <span className={styles.Extra}>{extra}</span>}
      </span>
    </span>
    {warning && (
      <span
        className={styles.Warning}
        role='img'
        aria-label={`${warning.text}. ${warning.title}`}
        title={`${warning.text}. ${warning.title}`}
      >
        !{warning.count > 1 ? warning.count : ''}
      </span>
    )}
  </div>
);

/** Сколько своих зданий этого типа стоит без рабочего. */
const countIdle = (buildings: Building[], units: Unit[], type: BuildingType) =>
  buildings.filter(
    building => building.type === type && !findServingWorker(building, units),
  ).length;

const idleWarning = (count: number, name: string) =>
  count > 0
    ? {
        count,
        text: `${count} ${name} без рабочего`,
        title:
          'Рудник и лесопилка приносят доход, только если внутри работает рабочий. Подведите рабочего вплотную к зданию и нажмите «Работать».',
      }
    : undefined;

export const ResourcesInfo = () => {
  const { resources, populationCap } = useEconomySelectors();
  const { getEconomicBuildings } = useBuildingsSelectors();
  const { humanId, activePlayer } = useGameLoopSelectors();
  const units = useUnitsStore(state => state.units);
  const artel = useResearchStore(
    state => !!humanId && !!state.completed[humanId]?.includes('artel'),
  );
  if (!humanId) return null;

  // Прогноз на конец своего хода: добыча идёт только с рабочими. В чужой
  // ход рабочие действия уже потрачены добычей и восстановятся к своему
  // ходу, поэтому прогноз считает их восстановленными.
  const ownBuildings = getEconomicBuildings(humanId);
  const ownUnits = Object.values(units).filter(
    ({ owner }) => owner === humanId,
  );
  const income = calculateIncome(ownBuildings, ownUnits, {
    rested: activePlayer !== humanId,
    artel,
  });
  const { occupied, max } = populationCap[humanId];
  // Показываем запас без резерва под назначенные стройки: его не потратить.
  const all = Object.values(units);
  const stock = getAvailableResources(resources[humanId], all, humanId);
  const reserved = getReservedResources(all, humanId);
  const extra = (perTurn: number, held: number) =>
    held ? `+${perTurn}/ход · резерв ${held}` : `+${perTurn}/ход`;

  return (
    <div className={styles.Resources}>
      <Stat
        tone='gold'
        icon={<GoldIcon size={18} />}
        label='Золото'
        value={stock.gold}
        amount={stock.gold}
        extra={extra(income.gold, reserved.gold)}
        warning={idleWarning(
          countIdle(ownBuildings, ownUnits, 'mine'),
          'рудн.',
        )}
      />
      <Stat
        tone='wood'
        icon={<WoodIcon size={18} />}
        label='Древесина'
        value={stock.wood}
        amount={stock.wood}
        extra={extra(income.wood, reserved.wood)}
        warning={idleWarning(
          countIdle(ownBuildings, ownUnits, 'sawmill'),
          'лесоп.',
        )}
      />
      <Stat
        tone='population'
        icon={<PopulationIcon size={18} />}
        label='Население'
        value={`${occupied} / ${max}`}
        extra={occupied >= max ? 'предел' : undefined}
      />
      <ResearchStat owner={humanId} />
    </div>
  );
};
