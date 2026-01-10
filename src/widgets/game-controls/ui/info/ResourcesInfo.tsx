import { useBuildingsSelectors } from '@entities/buildings';
import { useEconomySelectors } from '@entities/economies';
import { calculateIncome } from '@features/game-loop';
import styles from './ResourcesInfo.styles.module.css';

export const ResourcesInfo = () => {
  const { resources, unitLimit } = useEconomySelectors();
  const { getEconomicBuildings } = useBuildingsSelectors();
  const income = calculateIncome(getEconomicBuildings('player'));

  return (
    <div className={styles.Resources}>
      <div>
        <span className={styles.Gold}>Золото:</span> {resources.player.gold}{' '}
        <span className={styles.Income}>(+{income.gold}/ход)</span>
      </div>
      <div>
        <span className={styles.Wood}>Древесина:</span> {resources.player.wood}{' '}
        <span className={styles.Income}>(+{income.wood}/ход)</span>
      </div>
      <div>
        <span className={styles.Limit}>Лимит юнитов:</span>{' '}
        {`${unitLimit.player.current} из ${unitLimit.player.max}`}{' '}
      </div>
    </div>
  );
};
