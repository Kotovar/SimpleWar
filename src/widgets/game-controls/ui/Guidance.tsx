import { useId, type ReactNode } from 'react';
import { usePreferencesStore, useSettingsStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { HINTS, TUTORIAL, type SummaryItem } from '../lib/guidance';
import { useGuidanceStore } from '../model/guidanceStore';
import styles from './Guidance.styles.module.css';

/** Немодальные подсказки и снимок событий: управление картой остаётся доступным. */
export const Guidance = () => {
  const { humanId, activePlayer } = useGameLoopSelectors();
  const prefs = usePreferencesStore();
  const state = useGuidanceStore();
  if (!humanId) return null;
  const summary = activePlayer === humanId ? state.summary : [];
  if (summary.length)
    return (
      <GuidancePanel>
        <TurnSummary
          summary={summary}
          turn={state.summaryTurn}
          onClose={state.dismissSummary}
        />
      </GuidancePanel>
    );
  if (prefs.hintsEnabled) {
    const hint = HINTS[state.hints[0]];
    if (hint)
      return (
        <GuidancePanel>
          <Hint hint={hint} onClose={state.dismissHint} />
        </GuidancePanel>
      );
  }
  if (!state.tutorialActive || !prefs.tutorialEnabled) return null;
  const step = TUTORIAL.find(item => !state.completed.includes(item.id));
  if (!step) return null;
  return (
    <GuidancePanel>
      <Tutorial step={step} />
    </GuidancePanel>
  );
};

const GuidancePanel = ({ children }: { children: ReactNode }) => {
  const titleId = useId();
  return (
    <aside className={styles.Guidance} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.Title}>
        Помощник
      </h2>
      {children}
    </aside>
  );
};

const Hint = ({
  hint,
  onClose,
}: {
  hint: (typeof HINTS)[keyof typeof HINTS];
  onClose: () => void;
}) => (
  <section aria-label='Подсказка' aria-live='polite'>
    <header className={styles.Header}>
      <h3>{hint.title}</h3>
      <button onClick={onClose} aria-label='Закрыть подсказку'>
        ×
      </button>
    </header>
    <p>{hint.text}</p>
  </section>
);

const TurnSummary = ({
  summary,
  turn,
  onClose,
}: {
  summary: SummaryItem[];
  turn: number;
  onClose: () => void;
}) => {
  const centerOn = useSettingsStore(store => store.centerOn);
  return (
    <section aria-label='Сводка хода'>
      <header className={styles.Header}>
        <h3>Сводка · ход {turn}</h3>
        <button onClick={onClose} aria-label='Закрыть сводку'>
          ×
        </button>
      </header>
      <p className={styles.Note}>
        События с начала прошлого вашего хода. Переход показывает место события,
        а не живую цель.
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
                {item.count > 1 ? ` ×${item.count}` : ''} · {item.position.x},{' '}
                {item.position.y}
              </button>
            ) : (
              item.text
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

const Tutorial = ({ step }: { step: (typeof TUTORIAL)[number] }) => {
  const skipTutorial = useGuidanceStore(state => state.skipTutorial);
  const setTutorialEnabled = usePreferencesStore(
    state => state.setTutorialEnabled,
  );
  return (
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
          <button onClick={skipTutorial}>Завершить обучение</button>
        )}
        <button onClick={skipTutorial}>Пропустить обучение</button>
        <button onClick={() => setTutorialEnabled(false)}>
          Отключить обучение
        </button>
      </div>
    </section>
  );
};
