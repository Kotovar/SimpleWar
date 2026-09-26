import type { ReactNode } from 'react';
import type { Building, BuildingType, Unit } from '@shared/config';
import { findServingWorker } from '@shared/lib';
import { useBuildingsSelectors } from '@entities/buildings';
import { useUnitsStore } from '@entities/units';
import { useEconomySelectors } from '@entities/economies';
import { calculateIncome, useGameLoopSelectors } from '@features/game-loop';
import { GoldIcon, PopulationIcon, WoodIcon } from '@shared/ui';
import styles from './ResourcesInfo.styles.module.css';

type StatProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  extra?: ReactNode;
  /** Предупреждение под значением, например о простое добычи. */
  warning?: { text: string; title: string };
  tone: 'gold' | 'wood' | 'population';
};

const Stat = ({ icon, label, value, extra, warning, tone }: StatProps) => (
  <div className={styles.Stat} data-tone={tone}>
    <span className={styles.Icon}>{icon}</span>
    <span className={styles.Body}>
      <span className={styles.Label}>{label}</span>
      <span className={styles.Value}>
        {value}
        {extra && <span className={styles.Extra}>{extra}</span>}
      </span>
      {warning && (
        <span className={styles.Warning} title={warning.title}>
          {warning.text}
        </span>
      )}
    </span>
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
        text: `${count} ${name} без рабочего`,
        title:
          'Рудник и лесопилка приносят доход, только если рядом стоит назначенный рабочий. Выберите рабочего рядом со зданием и нажмите «Работать».',
      }
    : undefined;

export const ResourcesInfo = () => {
  const { resources, populationCap } = useEconomySelectors();
  const { getEconomicBuildings } = useBuildingsSelectors();
  const { humanId, activePlayer } = useGameLoopSelectors();
  const units = useUnitsStore(state => state.units);
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
  });
  const { occupied, max } = populationCap[humanId];

  return (
    <div className={styles.Resources}>
      <Stat
        tone='gold'
        icon={<GoldIcon size={18} />}
        label='Золото'
        value={resources[humanId].gold}
        extra={`+${income.gold}/ход`}
        warning={idleWarning(
          countIdle(ownBuildings, ownUnits, 'mine'),
          'рудн.',
        )}
      />
      <Stat
        tone='wood'
        icon={<WoodIcon size={18} />}
        label='Древесина'
        value={resources[humanId].wood}
        extra={`+${income.wood}/ход`}
        warning={idleWarning(
          countIdle(ownBuildings, ownUnits, 'sawmill'),
          'лесоп.',
        )}
      />
      <Stat
        tone='population'
        icon={<PopulationIcon size={18} />}
        label='Лимит юнитов'
        value={`${occupied} / ${max}`}
        extra={occupied >= max ? 'предел' : undefined}
      />
    </div>
  );
};
