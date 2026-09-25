import type { ReactNode } from 'react';
import { useBuildingsSelectors } from '@entities/buildings';
import { useEconomySelectors } from '@entities/economies';
import { calculateIncome, useGameLoopSelectors } from '@features/game-loop';
import { GoldIcon, PopulationIcon, WoodIcon } from '@shared/ui';
import styles from './ResourcesInfo.styles.module.css';

type StatProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  extra?: ReactNode;
  tone: 'gold' | 'wood' | 'population';
};

const Stat = ({ icon, label, value, extra, tone }: StatProps) => (
  <div className={styles.Stat} data-tone={tone}>
    <span className={styles.Icon}>{icon}</span>
    <span className={styles.Body}>
      <span className={styles.Label}>{label}</span>
      <span className={styles.Value}>
        {value}
        {extra && <span className={styles.Extra}>{extra}</span>}
      </span>
    </span>
  </div>
);

export const ResourcesInfo = () => {
  const { resources, populationCap } = useEconomySelectors();
  const { getEconomicBuildings } = useBuildingsSelectors();
  const { humanId } = useGameLoopSelectors();
  if (!humanId) return null;

  const income = calculateIncome(getEconomicBuildings(humanId));
  const { occupied, max } = populationCap[humanId];

  return (
    <div className={styles.Resources}>
      <Stat
        tone='gold'
        icon={<GoldIcon size={18} />}
        label='Золото'
        value={resources[humanId].gold}
        extra={`+${income.gold}/ход`}
      />
      <Stat
        tone='wood'
        icon={<WoodIcon size={18} />}
        label='Древесина'
        value={resources[humanId].wood}
        extra={`+${income.wood}/ход`}
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
