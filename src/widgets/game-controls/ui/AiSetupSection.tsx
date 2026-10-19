import { useState } from 'react';
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
import { Select } from '@shared/ui';
import { useSettingsStore } from '@entities/settings';
import { StepLabel } from './StepLabel';
import styles from './styles.module.css';

/**
 * Настройка противников обычной партии: профиль стратегии и сложность каждого.
 * Профили без описаний — характер игрок узнаёт в партии. Сложность меняет
 * только стартовые запасы ИИ — это показано до старта.
 */
export const AiSetupSection = () => {
  const aiSetups = useSettingsStore(state => state.aiSetups);
  const setAiCount = useSettingsStore(state => state.setAiCount);
  const setAiSetup = useSettingsStore(state => state.setAiSetup);
  const [active, setActive] = useState(0);
  const selected = Math.min(active, aiSetups.length - 1);
  const aiSetup = aiSetups[selected];
  const owner = PARTICIPANT_IDS[selected + 1];
  const { stockBonus } = AI_DIFFICULTY[aiSetup.difficulty];
  const start = START_RESOURCES[owner];

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
            onClick={() => {
              setAiCount(index + 1);
              setActive(Math.min(selected, index));
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <div
        className={clsx(styles.ButtonGroup, styles.AiTabs)}
        role='group'
        aria-label='Настраиваемый противник'
      >
        {aiSetups.map((_, index) => (
          <button
            key={PARTICIPANT_IDS[index + 1]}
            className={clsx(styles.ToggleButton, {
              [styles.Active]: selected === index,
            })}
            aria-pressed={selected === index}
            onClick={() => setActive(index)}
          >
            {OWNER_NAME[PARTICIPANT_IDS[index + 1]]}
          </button>
        ))}
      </div>
      <fieldset className={styles.AiOpponent}>
        <legend className={styles.Label}>{OWNER_NAME[owner]}</legend>
        <div className={styles.AiFields}>
          <label className={styles.AiField}>
            <span className={styles.Label}>Профиль</span>
            <Select
              name={`ai-profile-${owner}`}
              value={aiSetup.profile}
              options={AI_PROFILE_TYPES.map(value => ({
                value,
                label: AI_PROFILES[value].name,
              }))}
              onChange={profile => setAiSetup(selected, { profile })}
            />
          </label>
          <label className={styles.AiField}>
            <span className={styles.Label}>Сложность</span>
            <Select
              name={`ai-difficulty-${owner}`}
              value={aiSetup.difficulty}
              options={AI_DIFFICULTY_TYPES.map(value => ({
                value,
                label: AI_DIFFICULTY[value].name,
              }))}
              onChange={difficulty => setAiSetup(selected, { difficulty })}
            />
          </label>
        </div>
        <p className={clsx(styles.SeedWarning, styles.AiStock)}>
          <span>
            ИИ: {Math.max(0, start.gold + stockBonus.gold)} золота,{' '}
            {Math.max(0, start.wood + stockBonus.wood)} дерева
          </span>
          <span>
            Вы: {START_RESOURCES.p1.gold} золота, {START_RESOURCES.p1.wood}{' '}
            дерева
          </span>
        </p>
      </fieldset>
      <p className={styles.SeedWarning}>
        Сложность меняет только стартовые запасы ИИ. Туман, цены и правила боя
        одинаковы.
      </p>
    </section>
  );
};
