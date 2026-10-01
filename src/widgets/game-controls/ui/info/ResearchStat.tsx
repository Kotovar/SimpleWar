import {
  RESEARCH_CONFIG,
  RESEARCH_TYPES,
  type ParticipantId,
} from '@shared/config';
import { ResearchIcon } from '@shared/ui';
import { useResearchStore } from '@entities/researches';
import { useBuildingsStore } from '@entities/buildings';
import { CancelResearch } from './ResearchPanel';
import styles from './ResourcesInfo.styles.module.css';

const POPOVER_ID = 'research-summary';

/**
 * Плашка исследований стороны в верхней панели: число изученных, текущая
 * работа и по клику — список всех исследований с их статусом. Видна и без
 * кузницы, чтобы изученное не терялось вместе с ней.
 *
 * @param owner - Сторона, чьи исследования показываются.
 */
export const ResearchStat = ({ owner }: { owner: ParticipantId }) => {
  const completed = useResearchStore(state => state.completed[owner]);
  const current = useResearchStore(state => state.current[owner]);
  const done = completed?.length ?? 0;
  // Без кузницы работа стоит: показываем паузу, а не «идёт».
  const hasForge = useBuildingsStore(state =>
    Object.values(state.buildings).some(
      building => building.owner === owner && building.type === 'forge',
    ),
  );

  return (
    <>
      <button
        type='button'
        className={styles.Stat}
        data-tone='research'
        popoverTarget={POPOVER_ID}
        aria-label={`Исследования: изучено ${done} из ${RESEARCH_TYPES.length}`}
      >
        <span className={styles.Icon}>
          <ResearchIcon size={18} />
        </span>
        <span className={styles.Body}>
          <span className={styles.Label}>Исследования</span>
          <span className={styles.Value}>
            {done} / {RESEARCH_TYPES.length}
            {current && (
              <span className={styles.Extra}>
                {RESEARCH_CONFIG[current.type].name} ·{' '}
                {hasForge ? `${current.turnsLeft} х.` : 'пауза'}
              </span>
            )}
          </span>
        </span>
      </button>
      <div id={POPOVER_ID} popover='auto' className={styles.Popover}>
        <h4 className={styles.PopoverTitle}>Исследования</h4>
        <ul className={styles.PopoverList}>
          {RESEARCH_TYPES.map(type => {
            const { name, effect } = RESEARCH_CONFIG[type];
            const status = completed?.includes(type)
              ? 'изучено'
              : current?.type === type
                ? hasForge
                  ? `идёт, осталось ходов: ${current.turnsLeft}`
                  : `на паузе: нет кузницы, осталось ходов: ${current.turnsLeft}`
                : 'не изучено';
            return (
              <li key={type} data-done={completed?.includes(type)}>
                <b>{name}</b> — {status}
                <span>{effect}</span>
              </li>
            );
          })}
        </ul>
        <CancelResearch owner={owner} />
        <p className={styles.PopoverHint}>Запуск — в панели своей кузницы.</p>
      </div>
    </>
  );
};
