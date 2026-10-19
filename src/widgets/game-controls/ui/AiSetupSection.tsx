import clsx from 'clsx';
import {
  AI_DIFFICULTY,
  AI_DIFFICULTY_TYPES,
  AI_PROFILE_TYPES,
  AI_PROFILES,
  OWNER_NAME,
  PARTICIPANT_IDS,
  START_RESOURCES,
} from '@shared/config';
import { useSettingsStore } from '@entities/settings';
import { StepLabel } from './StepLabel';
import styles from './styles.module.css';

/** Подпись прибавки: «+150» / «−80» / «как у вас». */
const signed = (value: number) =>
  value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '±0';

/**
 * Настройка противников обычной партии: профиль стратегии и сложность каждого.
 * Профили без описаний — характер игрок узнаёт в партии. Сложность меняет
 * только стартовые запасы ИИ — это показано до старта.
 */
export const AiSetupSection = () => {
  const aiSetups = useSettingsStore(state => state.aiSetups);
  const setAiCount = useSettingsStore(state => state.setAiCount);
  const setAiSetup = useSettingsStore(state => state.setAiSetup);

  return (
    <section className={styles.Section}>
      <StepLabel step={3}>Противники</StepLabel>
      <div
        className={styles.ButtonGroup}
        role='group'
        aria-label='Число противников'
      >
        {PARTICIPANT_IDS.slice(1).map((id, index) => (
          <button
            key={id}
            className={clsx(styles.ToggleButton, {
              [styles.Active]: aiSetups.length === index + 1,
            })}
            aria-pressed={aiSetups.length === index + 1}
            onClick={() => setAiCount(index + 1)}
          >
            {index + 1}
          </button>
        ))}
      </div>
      {aiSetups.map((aiSetup, index) => {
        const owner = PARTICIPANT_IDS[index + 1];
        const { stockBonus } = AI_DIFFICULTY[aiSetup.difficulty];
        const start = START_RESOURCES[owner];
        return (
          <fieldset className={styles.AiOpponent} key={owner}>
            <legend className={styles.Label}>
              Противник {index + 1} — {OWNER_NAME[owner]}
            </legend>
            <div className={styles.Label}>Профиль</div>
            <div
              className={clsx(styles.ButtonGroup, styles.AiGroup)}
              role='group'
              aria-label='Профиль'
            >
              {AI_PROFILE_TYPES.map(profile => (
                <button
                  key={profile}
                  className={clsx(styles.ToggleButton, {
                    [styles.Active]: aiSetup.profile === profile,
                  })}
                  aria-pressed={aiSetup.profile === profile}
                  onClick={() => setAiSetup(index, { profile })}
                >
                  {AI_PROFILES[profile].name}
                </button>
              ))}
            </div>
            <div className={styles.Label}>Сложность</div>
            <div
              className={clsx(styles.ButtonGroup, styles.AiGroup)}
              role='group'
              aria-label='Сложность'
            >
              {AI_DIFFICULTY_TYPES.map(difficulty => {
                const { gold, wood } = AI_DIFFICULTY[difficulty].stockBonus;
                return (
                  <button
                    key={difficulty}
                    className={clsx(styles.ToggleButton, {
                      [styles.Active]: aiSetup.difficulty === difficulty,
                    })}
                    aria-pressed={aiSetup.difficulty === difficulty}
                    onClick={() => setAiSetup(index, { difficulty })}
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
              {Math.max(0, start.wood + stockBonus.wood)} дерева, вы — с{' '}
              {START_RESOURCES.p1.gold} и {START_RESOURCES.p1.wood}. Туман, цены
              и правила боя одинаковы на всех уровнях.
            </p>
          </fieldset>
        );
      })}
    </section>
  );
};
