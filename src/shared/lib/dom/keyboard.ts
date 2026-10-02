/** Кнопки-флажки не печатают текст: стрелки на них двигают камеру. */
const NON_TEXT_INPUTS = ['checkbox', 'radio', 'button', 'submit', 'reset'];

/**
 * Фокус в поле ввода: горячие клавиши игры в нём не срабатывают.
 *
 * @param target - Цель события клавиатуры.
 */
export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement &&
      !NON_TEXT_INPUTS.includes(target.type)));

const SPECIAL: Record<string, string> = {
  Delete: 'Del',
  Backspace: '⌫',
  Escape: 'Esc',
  Enter: 'Enter',
  Tab: 'Tab',
  Space: 'Space',
  Period: '.',
  Equal: '+',
  Minus: '−',
  F1: 'F1',
};

/**
 * Подпись физической клавиши: буква текущей раскладки, если браузер её
 * сообщает (Keyboard Layout Map), иначе латиница; цифры и служебные — как есть.
 *
 * @param code - `KeyboardEvent.code`.
 * @param layout - Раскладка из `navigator.keyboard.getLayoutMap()`.
 */
export const formatKey = (
  code: string,
  layout?: ReadonlyMap<string, string> | null,
) => {
  if (SPECIAL[code]) return SPECIAL[code];
  if (code.startsWith('Digit')) return code.slice(5);
  const fromLayout = layout?.get(code);
  if (fromLayout) return fromLayout.toUpperCase();
  return code.startsWith('Key') ? code.slice(3) : code;
};
