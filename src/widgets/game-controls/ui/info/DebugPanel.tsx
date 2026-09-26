import { useState } from 'react';
import {
  DEBUG_EXCEPTIONS,
  MAP_GENERATOR_VERSION,
  OWNER_NAME,
  type ParticipantId,
} from '@shared/config';
import { useMapStore } from '@entities/maps';
import { useDebugStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { AiDecisionLog } from './AiDecisionLog';
import styles from './DebugPanel.styles.module.css';

type Target = ParticipantId | 'all';

/**
 * Панель исключений режима отладки. Каждое исключение включается для
 * выбранного участника или явно для всех; видна только при включённом режиме.
 */
export const DebugPanel = () => {
  const { participants, humanId } = useGameLoopSelectors();
  const seed = useMapStore(state => state.seed);
  const usedFallback = useMapStore(state => state.usedFallback);
  const enabled = useDebugStore(state => state.enabled);
  const exceptions = useDebugStore(state => state.exceptions);
  const setException = useDebugStore(state => state.setException);
  const fullView = useDebugStore(state => state.fullView);
  const viewer = useDebugStore(state => state.viewer);
  const setFullView = useDebugStore(state => state.setFullView);
  const setViewer = useDebugStore(state => state.setViewer);
  const [target, setTarget] = useState<Target>(humanId ?? 'all');

  if (!enabled) return null;

  const ids = target === 'all' ? participants.map(({ id }) => id) : [target];
  const nameOf = (id: ParticipantId) =>
    id === humanId ? 'Вы' : OWNER_NAME[id];

  return (
    <section className={styles.Panel} aria-label='Режим отладки'>
      <h4 className={styles.Title}>Отладка</h4>
      {seed !== null && (
        <dl className={styles.MapMeta}>
          <div>
            <dt>Сид</dt>
            <dd>{seed}</dd>
          </div>
          <div>
            <dt>Генератор</dt>
            <dd>v{MAP_GENERATOR_VERSION}</dd>
          </div>
          {usedFallback && (
            <div>
              <dt>Карта</dt>
              <dd>Резервная</dd>
            </div>
          )}
        </dl>
      )}
      <label className={styles.Toggle}>
        <input
          type='checkbox'
          checked={fullView}
          onChange={event => setFullView(event.target.checked)}
        />
        Отключить туман
      </label>
      <label className={styles.Target}>
        Смотреть глазами
        <select
          value={viewer ?? humanId ?? ''}
          disabled={fullView}
          onChange={event =>
            setViewer(
              event.target.value === humanId
                ? null
                : (event.target.value as ParticipantId),
            )
          }
        >
          {participants.map(({ id, controller }) => (
            <option key={id} value={id}>
              {nameOf(id)}
              {controller === 'ai' ? ' (ИИ)' : ''}
            </option>
          ))}
        </select>
      </label>
      <p className={styles.ViewNote}>
        {fullView
          ? 'Полный обзор мира: видны все объекты. Знания участников и решения ИИ не меняются, атаковать скрытые цели нельзя.'
          : `Обзор участника «${nameOf(viewer ?? humanId ?? participants[0].id)}»: туман и память этой стороны.`}
      </p>
      <label className={styles.Target}>
        Исключения для
        <select
          value={target}
          onChange={event => setTarget(event.target.value as Target)}
        >
          <option value='all'>Все участники</option>
          {participants.map(({ id, controller }) => (
            <option key={id} value={id}>
              {nameOf(id)}
              {controller === 'ai' ? ' (ИИ)' : ''}
            </option>
          ))}
        </select>
      </label>
      {DEBUG_EXCEPTIONS.map(({ id, label }) => {
        const holders = ids.filter(owner => exceptions[owner]?.includes(id));
        const isPartial = holders.length > 0 && holders.length < ids.length;

        return (
          <label key={id} className={styles.Toggle}>
            <input
              type='checkbox'
              checked={holders.length === ids.length}
              // Для «Все участники»: исключение включено не у всех.
              ref={input => {
                if (input) input.indeterminate = isPartial;
              }}
              onChange={event => setException(ids, id, event.target.checked)}
            />
            {label}
            {isPartial && (
              <span className={styles.Holders}>
                {holders.map(nameOf).join(', ')}
              </span>
            )}
          </label>
        );
      })}
      <AiDecisionLog />
    </section>
  );
};
