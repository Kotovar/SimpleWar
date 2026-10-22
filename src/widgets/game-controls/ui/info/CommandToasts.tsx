import { useEffect, useState } from 'react';
import {
  getParticipantName,
  isParticipantId,
  RESEARCH_CONFIG,
  type Participant,
  type ResearchType,
} from '@shared/config';
import { audio, pluralRu } from '@shared/lib';
import {
  getPlayerErrors,
  getVisibleRecords,
  useJournalStore,
  type JournalEntry,
} from '@entities/journals';
import { useDebugStore, useSettingsStore } from '@entities/settings';
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
  /** Клетка события: клик по сообщению переводит туда камеру. */
  position?: { x: number; y: number };
};

/** Текст уведомления по событию журнала; `null` — событие не уведомляет. */
const toNotice = (
  { id, type, details }: JournalEntry,
  participants: readonly Participant[],
): Toast | null => {
  if (type === 'siteClaimed' || type === 'siteBlocked') {
    const { message, x, y } = details ?? {};
    if (typeof message !== 'string') return null;
    return {
      key: `n${id}`,
      id,
      kind: type === 'siteClaimed' ? 'site' : 'rejected',
      mark: type === 'siteClaimed' ? '✓' : '!',
      message,
      position:
        typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined,
    };
  }
  if (type === 'eliminated') {
    const owner = details?.participant;
    if (!isParticipantId(owner)) return null;
    return {
      key: `n${id}`,
      id,
      kind: 'eliminated',
      mark: '✕',
      message: `${getParticipantName(owner, participants)} выбыли`,
    };
  }
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
    const { x, y } = details ?? {};
    return {
      key: `n${id}`,
      id,
      kind: 'threat',
      mark: '!',
      message:
        count > 1
          ? `Замечены враги: ${count} ${pluralRu(count, ['боец', 'бойца', 'бойцов'])}`
          : 'Замечен враг',
      position:
        typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined,
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
  const { humanId, participants } = useGameLoopSelectors();
  const errors = useJournalStore(state => state.errors);
  const entries = useJournalStore(state => state.entries);
  const debug = useDebugStore(state => state.enabled);
  const centerOn = useSettingsStore(state => state.centerOn);
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
        // Своё выбывание завершает партию: его показывает итог.
        .filter(
          entry =>
            entry.type !== 'eliminated' ||
            entry.details?.participant !== humanId,
        )
        .flatMap(entry => toNotice(entry, participants) ?? [])
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

  const hide = (key: string) => setHidden(set => new Set(set).add(key));

  return (
    <div className={styles.Toasts}>
      {visible.map(toast => (
        <div
          key={toast.key}
          className={styles.Toast}
          data-kind={toast.kind}
          data-link={toast.position ? '' : undefined}
          title={toast.position ? 'Камера к месту события' : undefined}
          onClick={
            toast.position &&
            (() => {
              centerOn(toast.position!.x + 0.5, toast.position!.y + 0.5, true);
              hide(toast.key);
            })
          }
          onAnimationEnd={() => hide(toast.key)}
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
