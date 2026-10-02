/**
 * Справочник действий нижней панели и горячих клавиш. Клавиша — физическая
 * позиция (`KeyboardEvent.code`): `B` работает и на русской «И». WASD,
 * стрелки и `+`/`−` заняты камерой, поэтому действия их не используют.
 * Новое действие — запись здесь и кнопка в списке действий выбранного.
 */
export const ACTIONS = {
  skip: {
    label: 'Пропустить ход',
    code: 'Space',
    hint: 'Сжечь все очки движения и стройки/атаки до следующего своего хода',
  },
  sleep: {
    label: 'Спать / разбудить',
    code: 'KeyF',
    hint: 'Не напоминать до пробуждения; успешный прямой приказ будит юнита',
  },
  build: {
    label: 'Построить',
    code: 'KeyB',
    hint: 'Выбрать здание: цифры 1–0 по порядку карточек',
  },
  work: {
    label: 'Работать',
    code: 'KeyG',
    hint: 'Войти в соседний рудник или лесопилку и добывать',
  },
  unassign: {
    label: 'Снять с работы',
    code: 'KeyX',
    hint: 'Рабочий выйдет из здания на соседнюю клетку',
  },
  clearForest: {
    label: 'Расчистить лес',
    code: 'KeyC',
    hint: 'Соседний лес станет полем; тратит очко стройки',
  },
  repair: {
    label: 'Ремонт',
    code: 'KeyR',
    hint: 'Починить соседнее своё здание',
  },
  prepareStrike: {
    label: 'Подготовить удар',
    code: 'KeyQ',
    hint: 'Выбрать клетку в 2–5 клетках: удар в начале следующего хода',
  },
  pickWorker: {
    label: 'Выбрать рабочего',
    code: 'KeyV',
    hint: 'Выбрать рабочего внутри здания',
  },
  cancelResearch: {
    label: 'Отменить исследование',
    code: 'Backspace',
    hint: 'Остановить работу кузницы; цена не возвращается',
  },
  demolish: {
    label: 'Снести',
    code: 'Delete',
    hint: 'Освобождает клетку; ресурсы не возвращаются',
  },
} as const satisfies Record<
  string,
  { label: string; code: string; hint: string }
>;

export type ActionId = keyof typeof ACTIONS;

/** Слоты подменю стройки, найма и исследований: `1`…`9`, `0`. */
export const SLOT_CODES = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
] as const;

/** Группа общих клавиш в справке. */
export type HotkeyGroup = 'camera' | 'selection' | 'turn';

/** Общие клавиши партии: действуют без выбранного объекта. */
export const GLOBAL_HOTKEYS: readonly {
  code: string;
  label: string;
  group: HotkeyGroup;
}[] = [
  { code: 'KeyW', label: 'Камера: вверх (или стрелки)', group: 'camera' },
  { code: 'KeyA', label: 'Камера: влево', group: 'camera' },
  { code: 'KeyS', label: 'Камера: вниз', group: 'camera' },
  { code: 'KeyD', label: 'Камера: вправо', group: 'camera' },
  { code: 'ArrowUp', label: 'Камера: вверх', group: 'camera' },
  { code: 'ArrowLeft', label: 'Камера: влево', group: 'camera' },
  { code: 'ArrowDown', label: 'Камера: вниз', group: 'camera' },
  { code: 'ArrowRight', label: 'Камера: вправо', group: 'camera' },
  { code: 'Equal', label: 'Приблизить', group: 'camera' },
  { code: 'Minus', label: 'Отдалить', group: 'camera' },
  { code: 'KeyH', label: 'Камера к ратуше', group: 'camera' },
  { code: 'Tab', label: 'Следующий юнит с действиями', group: 'selection' },
  { code: 'Period', label: 'Следующий свободный рабочий', group: 'selection' },
  {
    code: 'Escape',
    label: 'Отменить режим, затем снять выбор',
    group: 'selection',
  },
  { code: 'Enter', label: 'Завершить ход', group: 'turn' },
];
