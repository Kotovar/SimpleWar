import { useEffect, useState } from 'react';
import { RESEARCH_CONFIG, type ResearchType } from '@shared/config';
import { audio, pluralRu } from '@shared/lib';
import {
  getPlayerErrors,
  getVisibleRecords,
  useJournalStore,
  type JournalEntry,
} from '@entities/journals';
import { useDebugStore } from '@entities/settings';
import { useGameLoopSelectors } from '@features/game-loop';
import styles from './CommandToasts.styles.module.css';

/** Сколько последних уведомлений показывать одновременно. */
const NOTICE_LIMIT = 2;

type Toast = {
  key: string;
  id: number;
  kind: string;
  mark: string;
  message: string;
  count?: number;
  detail?: string;
};

/** Текст уведомления по событию журнала; `null` — событие не уведомляет. */
const toNotice = ({ id, type, details }: JournalEntry): Toast | null => {
  if (type === 'researchDone') {
    const research = details?.research as ResearchType | undefined;
    const name = research ? RESEARCH_CONFIG[research]?.name : undefined;
    return {
      key: `n${id}`,
      id,
      kind: 'research',
      mark: '✓',
      message: name
        ? `Исследование «${name}» завершено`
        : 'Исследование завершено',
    };
  }
  if (type === 'enemySpotted') {
    const count = Number(details?.count ?? 1);
    return {
      key: `n${id}`,
      id,
      kind: 'threat',
      mark: '!',
      message:
        count > 1
          ? `Замечены враги: ${count} ${pluralRu(count, ['боец', 'бойца', 'бойцов'])}`
          : 'Замечен враг',
    };
  }
  return null;
};

/**
 * Короткие сообщения игроку: отказы своих приказов (причина по-русски,
 * повтор подряд — счётчик) и уведомления из его журнала — завершённое
 * исследование, замеченный враг. Сообщение живёт на своей CSS-анимации и само
 * гаснет; повтор того же отказа перезапускает его. Новая партия очищает
 * журнал, а с ним и сообщения.
 */
export const CommandToasts = () => {
  const { humanId } = useGameLoopSelectors();
  const errors = useJournalStore(state => state.errors);
  const entries = useJournalStore(state => state.entries);
  const debug = useDebugStore(state => state.enabled);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const rejections: Toast[] = humanId
    ? getPlayerErrors(errors, humanId, debug).map(error => ({
        // Повтор отказа меняет счётчик и ключ: сообщение показывается заново.
        key: `${error.id}:${error.count}`,
        id: error.id,
        kind: error.kind,
        mark: '×',
        message: error.message,
        count: error.count,
        detail: error.detail,
      }))
    : [];
  const notices = humanId
    ? getVisibleRecords(entries, humanId)
        .flatMap(entry => toNotice(entry) ?? [])
        .slice(-NOTICE_LIMIT)
    : [];

  const latestRejection = rejections.at(-1)?.key ?? null;

  // Любой отказ — из клика по карте или кнопки панели — звучит одинаково.
  // Угрозу озвучивает слой карты вместе с «!» над врагом.
  useEffect(() => {
    if (latestRejection) audio.play('reject');
  }, [latestRejection]);

  const visible = [...rejections, ...notices]
    .filter(toast => !hidden.has(toast.key))
    .sort((a, b) => a.id - b.id);
  if (!visible.length) return null;

  return (
    <div className={styles.Toasts}>
      {visible.map(toast => (
        <div
          key={toast.key}
          className={styles.Toast}
          data-kind={toast.kind}
          onAnimationEnd={() => setHidden(set => new Set(set).add(toast.key))}
        >
          <span className={styles.Mark} aria-hidden>
            {toast.mark}
          </span>
          <span>{toast.message}</span>
          {(toast.count ?? 0) > 1 && (
            <span className={styles.Count}>×{toast.count}</span>
          )}
          {toast.detail && (
            <span className={styles.Detail}>{toast.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
};
