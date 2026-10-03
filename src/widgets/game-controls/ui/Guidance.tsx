import { useId } from 'react';
import { usePreferencesStore, useSettingsStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { HINTS, TUTORIAL } from '../lib/guidance';
import { useGuidanceStore } from '../model/guidanceStore';
import styles from './Guidance.styles.module.css';

/** Немодальные подсказки и снимок событий: управление картой остаётся доступным. */
export const Guidance = () => {
  const { humanId, activePlayer } = useGameLoopSelectors();
  const prefs = usePreferencesStore();
  const state = useGuidanceStore();
  const titleId = useId();
  const centerOn = useSettingsStore(store => store.centerOn);
  if (!humanId) return null;
  const summary = activePlayer === humanId ? state.summary : [];
  const hint =
    !summary.length && prefs.hintsEnabled && state.hints[0]
      ? HINTS[state.hints[0]]
      : undefined;
  const step =
    !summary.length && !hint && state.tutorialActive && prefs.tutorialEnabled
      ? TUTORIAL.find(item => !state.completed.includes(item.id))
      : undefined;
  if (!step && !hint && !summary.length) return null;
  return (
    <aside className={styles.Guidance} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.Title}>
        Помощник
      </h2>
      {summary.length > 0 && (
        <section aria-label='Сводка хода'>
          <header className={styles.Header}>
            <h3>Сводка · ход {state.summaryTurn}</h3>
            <button onClick={state.dismissSummary} aria-label='Закрыть сводку'>
              ×
            </button>
          </header>
          <p className={styles.Note}>
            События с начала прошлого вашего хода. Переход показывает место
            события, а не живую цель.
          </p>
          <ul className={styles.Events}>
            {summary.map(item => (
              <li key={item.key}>
                {item.position ? (
                  <button
                    onClick={() =>
                      centerOn(item.position!.x + 0.5, item.position!.y + 0.5)
                    }
                    title='Камера к месту события'
                  >
                    {item.text}
                    {item.count > 1 ? ` ×${item.count}` : ''} ·{' '}
                    {item.position.x}, {item.position.y}
                  </button>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {hint && (
        <section aria-label='Подсказка' aria-live='polite'>
          <header className={styles.Header}>
            <h3>{hint.title}</h3>
            <button onClick={state.dismissHint} aria-label='Закрыть подсказку'>
              ×
            </button>
          </header>
          <p>{hint.text}</p>
        </section>
      )}
      {step && (
        <section aria-label='Обучение' aria-live='polite'>
          <header className={styles.Header}>
            <h3>
              Обучение · {TUTORIAL.indexOf(step) + 1}/{TUTORIAL.length}:{' '}
              {step.title}
            </h3>
          </header>
          <p>{step.text}</p>
          <div className={styles.Actions}>
            {step.id === 'victory' && (
              <button onClick={state.skipTutorial}>Завершить обучение</button>
            )}
            <button onClick={state.skipTutorial}>Пропустить обучение</button>
            <button onClick={() => prefs.setTutorialEnabled(false)}>
              Отключить обучение
            </button>
          </div>
        </section>
      )}
    </aside>
  );
};
