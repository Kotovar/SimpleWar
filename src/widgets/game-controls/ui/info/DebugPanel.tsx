import { useState } from 'react';
import {
  DEBUG_EXCEPTIONS,
  MAP_GENERATOR_VERSION,
  OWNER_NAME,
  type ParticipantId,
} from '@shared/config';
import { Checkbox, Select } from '@shared/ui';
import { useMapStore } from '@entities/maps';
import { useDebugStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import { AiDecisionLog } from './AiDecisionLog';
import styles from './DebugPanel.styles.module.css';

type Target = ParticipantId | 'all';

/**
 * Панель режима отладки под действиями выбранного объекта: настройки и
 * журнал решений ИИ сворачиваются отдельно. Каждое исключение включается
 * для выбранного участника или явно для всех; видна только в режиме отладки.
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
  // Свёрнуто по умолчанию: панель не отодвигает кнопки стройки и найма.
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!enabled) return null;

  const ids = target === 'all' ? participants.map(({ id }) => id) : [target];
  const nameOf = (id: ParticipantId) =>
    id === humanId ? 'Вы' : OWNER_NAME[id];
  const participantOptions = participants.map(({ id, controller }) => ({
    value: id,
    label: `${nameOf(id)}${controller === 'ai' ? ' (ИИ)' : ''}`,
  }));

  return (
    <section className={styles.Panel} aria-label='Режим отладки'>
      <h4 className={styles.Title}>Отладка</h4>
      <details
        className={styles.Section}
        open={settingsOpen}
        onToggle={event => setSettingsOpen(event.currentTarget.open)}
      >
        <summary>Сид, туман и исключения</summary>
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
        <Checkbox
          className={styles.Toggle}
          checked={fullView}
          onChange={setFullView}
        >
          Отключить туман
        </Checkbox>
        <label className={styles.Target}>
          Смотреть глазами
          <Select<ParticipantId | ''>
            value={viewer ?? humanId ?? ''}
            disabled={fullView}
            options={participantOptions}
            onChange={id => setViewer(id === humanId || !id ? null : id)}
          />
        </label>
        <p className={styles.ViewNote}>
          {fullView
            ? 'Полный обзор мира: видны все объекты. Знания участников и решения ИИ не меняются, атаковать скрытые цели нельзя.'
            : `Обзор участника «${nameOf(viewer ?? humanId ?? participants[0].id)}»: туман и память этой стороны.`}
        </p>
        <label className={styles.Target}>
          Исключения для
          <Select<Target>
            value={target}
            options={[
              { value: 'all', label: 'Все участники' },
              ...participantOptions,
            ]}
            onChange={setTarget}
          />
        </label>
        {DEBUG_EXCEPTIONS.map(({ id, label }) => {
          const holders = ids.filter(owner => exceptions[owner]?.includes(id));
          const isPartial = holders.length > 0 && holders.length < ids.length;

          return (
            <Checkbox
              key={id}
              className={styles.Toggle}
              checked={holders.length === ids.length}
              // Для «Все участники»: исключение включено не у всех.
              indeterminate={isPartial}
              onChange={checked => setException(ids, id, checked)}
            >
              {label}
              {isPartial && (
                <span className={styles.Holders}>
                  {holders.map(nameOf).join(', ')}
                </span>
              )}
            </Checkbox>
          );
        })}
      </details>
      <AiDecisionLog />
    </section>
  );
};
