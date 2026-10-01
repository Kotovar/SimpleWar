import { useEffect, useState } from 'react';
import { audio } from '@shared/lib';
import { getPlayerErrors, useJournalStore } from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import styles from './CommandToasts.styles.module.css';

/**
 * Короткие сообщения об отказе своих приказов: причина по-русски, повтор
 * подряд — счётчик. Сообщение живёт на своей CSS-анимации и само гаснет;
 * повтор того же отказа перезапускает его. Новая партия очищает журнал,
 * а с ним и сообщения.
 */
export const CommandToasts = () => {
  const { humanId } = useGameLoopSelectors();
  const errors = useJournalStore(state => state.errors);
  const debug = useDebugStore(state => state.enabled);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const shown = humanId ? getPlayerErrors(errors, humanId, debug) : [];
  // Повтор отказа меняет счётчик и ключ: сообщение показывается заново.
  const keyOf = (error: (typeof shown)[number]) => `${error.id}:${error.count}`;
  const latest = shown.at(-1);
  const latestKey = latest ? keyOf(latest) : null;

  // Любой отказ — из клика по карте или кнопки панели — звучит одинаково.
  useEffect(() => {
    if (latestKey) audio.play('reject');
  }, [latestKey]);

  const visible = shown.filter(error => !hidden.has(keyOf(error)));
  if (!visible.length) return null;

  return (
    <div className={styles.Toasts}>
      {visible.map(error => {
        const key = keyOf(error);
        return (
          <div
            key={key}
            className={styles.Toast}
            data-kind={error.kind}
            onAnimationEnd={() => setHidden(set => new Set(set).add(key))}
          >
            <span className={styles.Mark} aria-hidden>
              ×
            </span>
            <span>{error.message}</span>
            {error.count > 1 && (
              <span className={styles.Count}>×{error.count}</span>
            )}
            {error.detail && (
              <span className={styles.Detail}>{error.detail}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
