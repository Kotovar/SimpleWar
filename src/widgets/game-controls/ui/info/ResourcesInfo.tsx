import { useBuildingsSelectors } from '@entities/buildings';
import { useEconomySelectors } from '@entities/economies';
import { calculateIncome } from '@features/game-loop';
import styles from './ResourcesInfo.styles.module.css';

export const ResourcesInfo = () => {
  const { resources, populationCap } = useEconomySelectors();
  const { getEconomicBuildings } = useBuildingsSelectors();
  const income = calculateIncome(getEconomicBuildings('ai'));

  return (
    <div className={styles.Resources}>
      <div>
        <span className={styles.Gold}>Золото:</span> {resources.ai.gold}{' '}
        <span className={styles.Income}>(+{income.gold}/ход)</span>
      </div>
      <div>
        <span className={styles.Wood}>Древесина:</span> {resources.ai.wood}{' '}
        <span className={styles.Income}>(+{income.wood}/ход)</span>
      </div>
      <div>
        <span className={styles.Limit}>Лимит юнитов:</span>{' '}
        {`${populationCap.ai.occupied} из ${populationCap.ai.max}`}{' '}
      </div>
    </div>
  );
};
