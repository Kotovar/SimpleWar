import { RESEARCH_CONFIG, type ParticipantId } from '@shared/config';
import { useUnitsStore } from '@entities/units';
import { useBuildingsStore } from '@entities/buildings';
import { useEconomyStore } from '@entities/economies';
import { useResearchStore } from '@entities/researches';
import { getPlayerResult } from '../lib/gameResult';
import styles from './PhaseGameOver.styles.module.css';

export const PlayerResult = ({ player }: { player: ParticipantId }) => {
  const units = useUnitsStore(state => state.units);
  const buildings = useBuildingsStore(state => state.buildings);
  const resources = useEconomyStore(state => state.resources);
  const completed = useResearchStore(state => state.completed);
  const result = getPlayerResult(player, {
    units,
    buildings,
    resources,
    completed,
  });

  return (
    <section className={styles.Result} aria-label='Ваши итоги на конец партии'>
      <h3>Ваши итоги на конец партии</h3>
      <dl className={styles.Stats}>
        <div>
          <dt>Осталось юнитов</dt>
          <dd>{result.units}</dd>
        </div>
        <div>
          <dt>Осталось зданий</dt>
          <dd>{result.buildings}</dd>
        </div>
        <div>
          <dt>Золото</dt>
          <dd>{result.gold}</dd>
        </div>
        <div>
          <dt>Дерево</dt>
          <dd>{result.wood}</dd>
        </div>
      </dl>
      <p className={styles.Research}>
        Изучено:{' '}
        {result.research.length
          ? result.research.map(type => RESEARCH_CONFIG[type].name).join(', ')
          : 'нет завершённых исследований'}
      </p>
    </section>
  );
};
