import { ACTIONS, GLOBAL_HOTKEYS, SLOT_CODES } from '@shared/config';
import { formatKey } from '@shared/lib';

/** Собирает справку из справочника панели, без состояния партии и DOM. */
export const getHelpGroups = (layout?: ReadonlyMap<string, string> | null) => {
  const row = (code: string, label: string, hint?: string) => ({
    codes: [code],
    keys: formatKey(code, layout),
    label,
    hint,
  });
  return [
    {
      title: 'Мышь',
      items: [
        { codes: [], keys: 'ЛКМ', label: 'Выбрать или выполнить' },
        {
          codes: ['Space'],
          keys: 'ПКМ / СКМ / Пробел + ЛКМ',
          label: 'Двигать карту',
        },
        { codes: [], keys: 'Колесо', label: 'Масштаб' },
      ],
    },
    ...(['camera', 'selection', 'turn'] as const).map(group => ({
      title: { camera: 'Камера', selection: 'Выбор', turn: 'Ход' }[group],
      items: GLOBAL_HOTKEYS.filter(key => key.group === group).map(key =>
        row(key.code, key.label),
      ),
    })),
    {
      title: 'Действия выбранного',
      items: [
        ...Object.values(ACTIONS).map(action =>
          row(action.code, action.label, action.hint),
        ),
        {
          codes: [...SLOT_CODES],
          keys: `${formatKey(SLOT_CODES[0], layout)}…${formatKey(SLOT_CODES.at(-1)!, layout)}`,
          label: 'Здания, найм, исследования',
        },
      ],
    },
  ];
};
