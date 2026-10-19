import {
  DEFAULT_AUTO,
  MANUAL_SLOTS,
  type AutoSettings,
  type SaveRecord,
  type Slot,
} from './types';
import { parseRecord } from './validation';

type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const AUTO_KEY = 'simplewar:saves:auto';
export const AUTO_SETTINGS_KEY = 'simplewar:saves:settings';
export const manualKey = (index: number) => {
  if (!Number.isInteger(index) || index < 0 || index >= MANUAL_SLOTS)
    throw new Error('Неизвестный ручной слот');
  return `simplewar:saves:manual:${index}`;
};
const autoRecords = (storage: StoragePort): unknown[] => {
  const raw = storage.getItem(AUTO_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 5)
    throw new Error('Повреждена ротация автосохранений');
  return value;
};
const slot = (key: string, auto: boolean, raw: string | null): Slot => {
  if (!raw) return { key, auto };
  try {
    return { key, auto, record: parseRecord(raw) };
  } catch (error) {
    return {
      key,
      auto,
      damagedRaw: raw,
      error: error instanceof Error ? error.message : 'Слот повреждён',
    };
  }
};
export const listSlots = (storage: StoragePort = localStorage): Slot[] => {
  const slots = Array.from({ length: MANUAL_SLOTS }, (_, i) =>
    slot(manualKey(i), false, storage.getItem(manualKey(i))),
  );
  try {
    const ids = new Set<string>();
    autoRecords(storage).forEach((raw, i) => {
      const entry = slot(`auto:damaged:${i}`, true, JSON.stringify(raw));
      if (entry.record && !ids.has(entry.record.id)) {
        ids.add(entry.record.id);
        entry.key = `auto:${entry.record.id}`;
      } else if (entry.record) {
        entry.damagedRaw = JSON.stringify(raw);
        entry.error = 'Повторяющийся ID автосохранения';
        delete entry.record;
      }
      slots.push(entry);
    });
  } catch {
    slots.push({
      key: AUTO_KEY,
      auto: true,
      damagedRaw: storage.getItem(AUTO_KEY) ?? undefined,
      error: 'Повреждена ротация автосохранений',
    });
  }
  return slots;
};
export const writeManual = (
  key: string,
  record: SaveRecord,
  storage: StoragePort = localStorage,
) => {
  if (
    !Array.from({ length: MANUAL_SLOTS }, (_, i) => manualKey(i)).includes(key)
  )
    throw new Error('Неизвестный ручной слот');
  const raw = JSON.stringify(record);
  parseRecord(raw);
  storage.setItem(key, raw);
};
export const writeAuto = (
  record: SaveRecord,
  keep: number,
  storage: StoragePort = localStorage,
) => {
  if (!Number.isInteger(keep) || keep < 1 || keep > 5)
    throw new Error('Неверный размер ротации');
  parseRecord(JSON.stringify(record));
  // Вся ротация меняется одной атомарной записью. При отказе старые снимки остаются.
  storage.setItem(
    AUTO_KEY,
    JSON.stringify([record, ...autoRecords(storage)].slice(0, keep)),
  );
};
const autoIndex = (records: unknown[], key: string) =>
  records.findIndex(
    value =>
      !!value &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string' &&
      `auto:${value.id}` === key,
  );
export const removeSlot = (
  key: string,
  storage: StoragePort = localStorage,
  damagedRaw?: string,
) => {
  if (key === AUTO_KEY) {
    if (damagedRaw !== undefined && storage.getItem(AUTO_KEY) !== damagedRaw)
      throw new Error('Слот изменился; выберите его снова');
    storage.removeItem(AUTO_KEY);
    return;
  }
  if (key.startsWith('auto:')) {
    const records = autoRecords(storage);
    const index = key.startsWith('auto:damaged:')
      ? Number(key.slice(13))
      : autoIndex(records, key);
    if (
      damagedRaw !== undefined &&
      JSON.stringify(records[index]) !== damagedRaw
    )
      throw new Error('Слот изменился; выберите его снова');
    if (!Number.isInteger(index) || index < 0 || index >= records.length)
      throw new Error('Слот уже недоступен');
    storage.setItem(
      AUTO_KEY,
      JSON.stringify(records.filter((_, i) => i !== index)),
    );
  } else {
    manualKey(Number(key.split(':').at(-1)));
    if (!key.startsWith('simplewar:saves:manual:'))
      throw new Error('Неизвестный слот');
    storage.removeItem(key);
  }
};
export const renameSlot = (
  key: string,
  name: string,
  storage: StoragePort = localStorage,
) => {
  const found = listSlots(storage).find(s => s.key === key);
  if (!found?.record) throw new Error('Слот недоступен');
  const record = { ...found.record, name: name.trim() };
  parseRecord(JSON.stringify(record));
  if (!found.auto) writeManual(key, record, storage);
  else {
    const records = autoRecords(storage);
    const index = autoIndex(records, key);
    if (index < 0) throw new Error('Слот уже недоступен');
    records[index] = record;
    storage.setItem(AUTO_KEY, JSON.stringify(records));
  }
};
export const readAutoSettings = (
  storage: StoragePort = localStorage,
): AutoSettings => {
  const raw = storage.getItem(AUTO_SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_AUTO };
  return parseAutoSettings(JSON.parse(raw));
};
export const parseAutoSettings = (value: unknown): AutoSettings => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('enabled' in value) ||
    typeof value.enabled !== 'boolean' ||
    !('interval' in value) ||
    ![1, 3, 5].includes(Number(value.interval)) ||
    typeof value.interval !== 'number' ||
    !('keep' in value) ||
    typeof value.keep !== 'number' ||
    !Number.isInteger(value.keep) ||
    value.keep < 1 ||
    value.keep > 5
  )
    throw new Error('Повреждены настройки автосохранения');
  return {
    enabled: value.enabled,
    interval: value.interval as 1 | 3 | 5,
    keep: value.keep,
  };
};
export const writeAutoSettings = (
  settings: AutoSettings,
  storage: StoragePort = localStorage,
) =>
  storage.setItem(
    AUTO_SETTINGS_KEY,
    JSON.stringify(parseAutoSettings(settings)),
  );
