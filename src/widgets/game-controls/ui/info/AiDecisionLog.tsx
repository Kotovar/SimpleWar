import { useState } from 'react';
import { OWNER_NAME, type ParticipantId } from '@shared/config';
import { useJournalStore } from '@entities/journals';
import { useGameLoopSelectors } from '@features/game-loop';
import styles from './DebugPanel.styles.module.css';

/** Сколько последних решений показывать: полный список хранит журнал. */
const SHOWN = 60;

/**
 * Журнал решений ИИ для разработчика: стратегия, правило, основания,
 * альтернативы и итог команды. Виден только в режиме отладки; очистка
 * не меняет игру и память ИИ.
 */
export const AiDecisionLog = () => {
  const { participants } = useGameLoopSelectors();
  const decisions = useJournalStore(state => state.decisions);
  const clearDecisions = useJournalStore(state => state.clearDecisions);
  const ais = participants.filter(({ controller }) => controller === 'ai');
  const [actor, setActor] = useState<ParticipantId | 'all'>('all');
  const [turn, setTurn] = useState('');
  const [rule, setRule] = useState('');
  const [subject, setSubject] = useState('');

  const shown = decisions
    .filter(
      d =>
        (actor === 'all' || d.actor === actor) &&
        (!turn || d.turn === Number(turn)) &&
        (!rule || d.ruleId.toLowerCase().includes(rule.toLowerCase())) &&
        (!subject ||
          d.actorId?.includes(subject) ||
          d.taskId?.includes(subject)),
    )
    .slice(-SHOWN)
    .reverse();

  return (
    <details className={styles.AiLog}>
      <summary>Решения ИИ ({decisions.length})</summary>
      <div className={styles.AiFilters}>
        <select
          aria-label='ИИ-участник'
          value={actor}
          onChange={event =>
            setActor(event.target.value as ParticipantId | 'all')
          }
        >
          <option value='all'>Все ИИ</option>
          {ais.map(({ id }) => (
            <option key={id} value={id}>
              {OWNER_NAME[id]}
            </option>
          ))}
        </select>
        <input
          aria-label='Номер хода'
          placeholder='Ход'
          inputMode='numeric'
          value={turn}
          onChange={event => setTurn(event.target.value.replace(/\D/g, ''))}
        />
        <input
          aria-label='ID правила'
          placeholder='Правило'
          value={rule}
          onChange={event => setRule(event.target.value)}
        />
        <input
          aria-label='Юнит или задача'
          placeholder='Юнит/задача'
          value={subject}
          onChange={event => setSubject(event.target.value)}
        />
        <button type='button' onClick={clearDecisions}>
          Очистить
        </button>
      </div>
      <ol className={styles.AiEntries}>
        {shown.map(d => (
          <li
            key={d.id}
            data-result={
              d.result === 'ok' || d.result === 'endTurn' ? d.result : 'failed'
            }
          >
            <div>
              <strong>
                {OWNER_NAME[d.actor]} · ход {d.turn} · шаг {d.step} · {d.ruleId}
              </strong>{' '}
              {d.action} → {d.result}
            </div>
            <div className={styles.AiMeta}>
              {d.strategy}. {d.reason}
              {d.actorId && ` · исполнитель ${d.actorId.slice(0, 13)}`}
            </div>
            {Object.keys(d.basis).length > 0 && (
              <div className={styles.AiMeta}>
                Основания:{' '}
                {Object.entries(d.basis)
                  .map(([key, value]) => `${key}=${value}`)
                  .join(', ')}
              </div>
            )}
            {d.alternatives.length > 0 && (
              <div className={styles.AiMeta}>
                Альтернативы:{' '}
                {d.alternatives
                  .map(alt => `${alt.ruleId} ${alt.score} (${alt.reason})`)
                  .join('; ')}
              </div>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
};
