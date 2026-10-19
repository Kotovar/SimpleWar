import clsx from 'clsx';
import {
  AI_DIFFICULTY,
  AI_DIFFICULTY_TYPES,
  AI_PROFILE_TYPES,
  AI_PROFILES,
  START_RESOURCES,
} from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { StepLabel } from './StepLabel';
import styles from './styles.module.css';

/** Подпись прибавки: «+150» / «−80» / «как у вас». */
const signed = (value: number) =>
  value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '±0';

/**
 * Настройка противника обычной партии: профиль стратегии и сложность.
 * Профили без описаний — характер игрок узнаёт в партии. Сложность меняет
 * только стартовые запасы ИИ — это показано до старта.
 */
export const AiSetupSection = () => {
  const aiSetup = useSettingsStore(state => state.aiSetup);
  const setAiSetup = useSettingsStore(state => state.setAiSetup);
  const { stockBonus } = AI_DIFFICULTY[aiSetup.difficulty];
  const start = START_RESOURCES.p2;

  return (
    <section className={styles.Section}>
      <StepLabel step={3}>Противник</StepLabel>
      <div className={clsx(styles.ButtonGroup, styles.AiGroup)}>
        {AI_PROFILE_TYPES.map(profile => (
          <button
            key={profile}
            className={clsx(styles.ToggleButton, {
              [styles.Active]: aiSetup.profile === profile,
            })}
            aria-pressed={aiSetup.profile === profile}
            onClick={() => setAiSetup({ profile })}
          >
            {AI_PROFILES[profile].name}
          </button>
        ))}
      </div>

      <div className={styles.Label}>Сложность</div>
      <div className={clsx(styles.ButtonGroup, styles.AiGroup)}>
        {AI_DIFFICULTY_TYPES.map(difficulty => {
          const { gold, wood } = AI_DIFFICULTY[difficulty].stockBonus;
          return (
            <button
              key={difficulty}
              className={clsx(styles.ToggleButton, {
                [styles.Active]: aiSetup.difficulty === difficulty,
              })}
              aria-pressed={aiSetup.difficulty === difficulty}
              onClick={() => setAiSetup({ difficulty })}
            >
              <span className={styles.ToggleTitle}>
                {AI_DIFFICULTY[difficulty].name}
              </span>
              <span className={styles.ToggleMeta}>
                золото {signed(gold)}, дерево {signed(wood)}
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.SeedWarning}>
        ИИ начнёт с {Math.max(0, start.gold + stockBonus.gold)} золота и{' '}
        {Math.max(0, start.wood + stockBonus.wood)} дерева, вы — с {start.gold}{' '}
        и {start.wood}. Туман, цены и правила боя одинаковы на всех уровнях.
      </p>
    </section>
  );
};
