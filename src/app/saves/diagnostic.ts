import { useDebugStore, usePreferencesStore } from '@entities/settings';
import { MAX_SAVE_BYTES, type GameSnapshot } from './types';
import { parseSnapshot } from './validation';
import { parseAutoSettings } from './storage';
import { requestSnapshot, useSaveStore } from './service';

export const diagnosticText = (snapshot: GameSnapshot) =>
  JSON.stringify(
    {
      kind: 'simplewar-diagnostic',
      version: 1,
      snapshot,
      application: {
        auto: useSaveStore.getState().auto,
        aiPlayback: usePreferencesStore.getState().aiPlayback,
      },
    },
    null,
    2,
  );
export const parseDiagnostic = (raw: string): GameSnapshot => {
  if (!useDebugStore.getState().enabled)
    throw new Error('Импорт диагностики доступен в режиме отладки');
  if (new Blob([raw]).size > MAX_SAVE_BYTES)
    throw new Error('Файл диагностики слишком большой (предел 8 МБ)');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Файл диагностики повреждён: неверный JSON');
  }
  if (
    !value ||
    typeof value !== 'object' ||
    !('kind' in value) ||
    value.kind !== 'simplewar-diagnostic' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('snapshot' in value)
  )
    throw new Error('Неизвестный формат диагностики');
  if (
    !('application' in value) ||
    !value.application ||
    typeof value.application !== 'object' ||
    !('auto' in value.application) ||
    !('aiPlayback' in value.application) ||
    typeof value.application.aiPlayback !== 'string' ||
    !['normal', 'fast', 'instant'].includes(value.application.aiPlayback)
  )
    throw new Error('Повреждены настройки диагностического файла');
  parseAutoSettings(value.application.auto);
  return parseSnapshot(JSON.stringify(value.snapshot));
};
export const exportDiagnostic = () =>
  requestSnapshot('export', snapshot => {
    const blob = new Blob([diagnosticText(snapshot)], {
      type: 'application/json',
    });
    if (blob.size > MAX_SAVE_BYTES)
      throw new Error('Диагностика превышает предел 8 МБ');
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `simplewar-turn-${snapshot.loop.currentTurn}.json`;
      a.click();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
