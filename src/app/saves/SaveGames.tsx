import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEBUG_EXCEPTIONS, AI_PROFILES, AI_DIFFICULTY } from '@shared/config';
import { Checkbox, ConfirmDialog, Select } from '@shared/ui';
import { useGameLoopStore } from '@entities/games';
import { useDebugStore } from '@entities/settings';
import { useJournalStore } from '@entities/journals';
import { exportDiagnostic, parseDiagnostic } from './diagnostic';
import {
  loadSnapshot,
  refreshSlots,
  reportSaveError,
  saveManual,
  setAutoSettings,
  useSaveStore,
} from './service';
import { removeSlot, renameSlot } from './storage';
import { MAX_SAVE_BYTES, type GameSnapshot, type Slot } from './types';
import styles from './styles.module.css';

const intervalLabels = {
  '1': '1 свой ход',
  '3': '3 своих хода',
  '5': '5 своих ходов',
};
const keepLabels: Record<string, string> = {
  '1': '1 автосохранение',
  '2': '2 автосохранения',
  '3': '3 автосохранения',
  '4': '4 автосохранения',
  '5': '5 автосохранений',
};

const debugDescription = (snapshot: GameSnapshot) => {
  const debug = snapshot.debug;
  if (
    !debug.usedInGame &&
    !debug.enabled &&
    !debug.fullView &&
    !Object.values(debug.exceptions).some(values => values.length)
  )
    return '';
  return `Отладочная партия. Режим ${debug.enabled ? 'включён' : 'выключен'}; полный обзор: ${debug.fullView ? 'включён' : 'выключен'}; наблюдатель: ${debug.viewer ?? 'человек'}. Исключения: ${
    Object.entries(debug.exceptions)
      .flatMap(([id, values]) =>
        values.map(
          value =>
            `${id}: ${DEBUG_EXCEPTIONS.find(e => e.id === value)?.label}`,
        ),
      )
      .join(', ') || 'нет'
  }.`;
};
type Confirmation =
  | { kind: 'save' | 'delete' | 'rename'; slot: Slot; name: string }
  | { kind: 'load'; snapshot: GameSnapshot };

const SlotRow = ({
  slot,
  index,
  canSave,
  onConfirm,
}: {
  slot: Slot;
  index: number;
  canSave: boolean;
  onConfirm: (confirmation: Confirmation) => void;
}) => {
  const [name, setName] = useState(slot.record?.name ?? `Партия ${index + 1}`);
  const snapshot = slot.record?.snapshot;
  const details = snapshot
    ? `${new Date(slot.record!.savedAt).toLocaleString('ru-RU')} · Ход ${snapshot.loop.currentTurn} · ${snapshot.rules.gridColumns}×${snapshot.rules.gridRows} · Сид ${snapshot.map.seed ?? 'нет'}`
    : 'Нет сохранённой партии';
  const participants =
    snapshot?.loop.participants
      .map(
        p =>
          `${p.id}: ${p.controller === 'human' ? 'человек' : p.controller === 'ai' ? `ИИ ${p.ai ? AI_PROFILES[p.ai.profile].name : 'Сбалансированный'}/${p.ai ? AI_DIFFICULTY[p.ai.difficulty].name : 'Обычный'}` : 'пассивный'}`,
      )
      .join(' · ') ?? '';
  const party = `${snapshot?.debug.usedInGame ? 'Отладочная · ' : ''}${participants}`;
  return (
    <li className={styles.Slot}>
      <div className={styles.Description}>
        <label>
          {slot.auto ? `Авто ${index - 4}` : `Слот ${index + 1}`}
          <input
            aria-label={`Имя слота ${index + 1}`}
            title={name}
            maxLength={60}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <div
          className={styles.Metadata}
          title={slot.error || `${details}\n${party}`}
        >
          {slot.error ? (
            <span role='alert' className={styles.Error}>
              {slot.error}
            </span>
          ) : (
            <>
              <span>{details}</span>
              <span>{party}</span>
            </>
          )}
        </div>
      </div>
      <div className={styles.Actions}>
        {!slot.auto && (
          <button
            className={styles.SaveButton}
            disabled={!canSave}
            onClick={() =>
              slot.record || slot.error
                ? onConfirm({ kind: 'save', slot, name })
                : void saveManual(slot.key, name)
            }
          >
            Сохранить
          </button>
        )}
        <button
          className={styles.LoadButton}
          disabled={!snapshot}
          onClick={() => snapshot && onConfirm({ kind: 'load', snapshot })}
        >
          Загрузить
        </button>
        <button
          disabled={!snapshot || !name.trim()}
          onClick={() => onConfirm({ kind: 'rename', slot, name })}
        >
          Переименовать
        </button>
        <button
          disabled={!slot.record && !slot.error}
          className={styles.DeleteButton}
          onClick={() => onConfirm({ kind: 'delete', slot, name })}
        >
          Удалить
        </button>
      </div>
    </li>
  );
};

const executeConfirmation = (
  confirmation: Confirmation | null,
  onClose: () => void,
) => {
  if (!confirmation) return;
  try {
    if (confirmation.kind === 'load') {
      if (loadSnapshot(confirmation.snapshot)) onClose();
    } else if (confirmation.kind === 'save')
      void saveManual(confirmation.slot.key, confirmation.name);
    else if (confirmation.kind === 'delete') {
      removeSlot(
        confirmation.slot.key,
        localStorage,
        confirmation.slot.damagedRaw,
      );
      refreshSlots();
    } else {
      renameSlot(confirmation.slot.key, confirmation.name);
      refreshSlots();
    }
  } catch (err) {
    reportSaveError('save', err);
  }
};

const readDiagnosticFile = async (
  file: File | undefined,
  gameId: number,
): Promise<GameSnapshot | null> => {
  if (!file) return null;
  try {
    if (file.size > MAX_SAVE_BYTES)
      throw new Error('Файл диагностики слишком большой (предел 8 МБ)');
    const snapshot = parseDiagnostic(await file.text());
    return gameId === useJournalStore.getState().gameId ? snapshot : null;
  } catch (error) {
    if (gameId === useJournalStore.getState().gameId)
      reportSaveError('import', error);
    return null;
  }
};

export const SaveGames = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const { slots, auto, error, status, waiting } = useSaveStore();
  const phase = useGameLoopStore(state => state.phase);
  const gameId = useJournalStore(state => state.gameId);
  const debug = useDebugStore(state => state.enabled);
  const canSave = (phase === 'inProgress' || phase === 'gameOver') && !waiting;
  useEffect(() => {
    if (!open) return;
    refreshSlots();
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, [open]);
  const ask = (next: Confirmation) => setConfirmation(next);
  const confirm = () => {
    executeConfirmation(confirmation, onClose);
    setConfirmation(null);
  };
  const importFile = async (file: File | undefined) => {
    const snapshot = await readDiagnosticFile(file, gameId);
    if (snapshot) ask({ kind: 'load', snapshot });
    if (fileInput.current) fileInput.current.value = '';
  };
  if (!open) return null;
  return createPortal(
    <>
      <dialog
        ref={dialog}
        className={styles.Dialog}
        aria-labelledby={titleId}
        onCancel={onClose}
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <header>
          <h2 id={titleId}>Сохранения</h2>
          <button onClick={onClose} aria-label='Закрыть сохранения'>
            ×
          </button>
        </header>
        <p role='status' className={styles.Status}>
          {waiting
            ? 'Ожидание завершения действий… Сброс или загрузка отменят запрос.'
            : status || 'Выберите слот для сохранения или продолжения партии.'}
        </p>
        {error && (
          <p role='alert' className={styles.Error}>
            {error}
          </p>
        )}
        <h3>Ручные слоты</h3>
        <ul>
          {slots
            .filter(s => !s.auto)
            .map((slot, i) => (
              <SlotRow
                key={`${slot.key}:${slot.record?.savedAt}:${slot.record?.name}`}
                slot={slot}
                index={i}
                canSave={canSave}
                onConfirm={ask}
              />
            ))}
        </ul>
        <h3>Автосохранения</h3>
        <div className={styles.Settings}>
          <Checkbox
            checked={auto.enabled}
            onChange={enabled => setAutoSettings({ ...auto, enabled })}
          >
            Включить автосохранение
          </Checkbox>
          <label>
            Каждые{' '}
            <Select<'1' | '3' | '5'>
              value={String(auto.interval) as '1' | '3' | '5'}
              onChange={interval =>
                setAutoSettings({
                  ...auto,
                  interval: Number(interval) as 1 | 3 | 5,
                })
              }
              options={(['1', '3', '5'] as const).map(value => ({
                value,
                label: intervalLabels[value],
              }))}
            />
          </label>
          <label>
            Хранить{' '}
            <Select
              value={String(auto.keep)}
              onChange={keep =>
                setAutoSettings({ ...auto, keep: Number(keep) })
              }
              options={['1', '2', '3', '4', '5'].map(value => ({
                value,
                label: keepLabels[value],
              }))}
            />
          </label>
        </div>
        <ul>
          {slots
            .filter(s => s.auto)
            .map((slot, i) => (
              <SlotRow
                key={`${slot.key}:${slot.record?.savedAt}:${slot.record?.name}`}
                slot={slot}
                index={i + 5}
                canSave={false}
                onConfirm={ask}
              />
            ))}
        </ul>
        {!slots.some(s => s.auto) && <p>Автосохранений пока нет.</p>}
        <details className={styles.Diagnostics}>
          <summary>Диагностика партии</summary>
          <p>
            Файл содержит полный мир, включая скрытые сведения, настройки и
            последние команды. Он скачивается локально и не отправляется в сеть.
            Импорт восстанавливает сцену для следующего действия; полного
            повтора истории нет.
          </p>
          <div className={styles.Actions}>
            <button disabled={!canSave} onClick={() => void exportDiagnostic()}>
              Скачать диагностику
            </button>
            {debug && (
              <label className={styles.Import}>
                Импорт диагностики
                <input
                  ref={fileInput}
                  type='file'
                  accept='.json,application/json'
                  onChange={e => void importFile(e.target.files?.[0])}
                />
              </label>
            )}
          </div>
        </details>
      </dialog>
      <SaveConfirmation
        confirmation={confirmation}
        onConfirm={confirm}
        onCancel={() => setConfirmation(null)}
      />
    </>,
    document.body,
  );
};

const SaveConfirmation = ({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: Confirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!confirmation) return null;
  const titles = {
    load: 'Загрузить партию',
    delete: 'Удалить сохранение',
    rename: 'Переименовать сохранение',
    save: 'Перезаписать слот',
  };
  const message =
    confirmation.kind === 'load'
      ? `Текущая партия будет заменена. ${debugDescription(confirmation.snapshot)}`
      : confirmation.kind === 'rename'
        ? `Новое имя: ${confirmation.name.trim()}`
        : 'Это действие изменит выбранный слот. Продолжить?';
  return (
    <ConfirmDialog
      isOpen
      intent={confirmation.kind === 'delete' ? 'danger' : 'primary'}
      title={titles[confirmation.kind]}
      message={message}
      confirmText={
        {
          load: 'Загрузить',
          save: 'Перезаписать',
          rename: 'Переименовать',
          delete: 'Удалить',
        }[confirmation.kind]
      }
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};
