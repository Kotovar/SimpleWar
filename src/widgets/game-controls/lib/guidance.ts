import {
  BUILDINGS_NAME,
  UNITS_NAME,
  RESEARCH_CONFIG,
  type ParticipantId,
  type Position,
} from '@shared/config';
import type { JournalEntry } from '@entities/journals';

export const HINTS = {
  keys: {
    title: 'Все клавиши — F1',
    text: 'Откройте справку клавишей F1 или кнопкой «?» в шапке. Там же — легенда подсветки карты.',
  },
  enemy: {
    title: 'Первая встреча',
    text: 'Враг появился в обзоре. ПКМ по видимой цели отдаёт приказ атаки. За туманом остаются только воспоминания.',
  },
  building: {
    title: 'Первая постройка',
    text: 'Руднику и лесопилке нужен рабочий внутри. Ферма увеличивает лимит населения. Новое здание найма получает действие в следующий свой ход.',
  },
  research: {
    title: 'Исследование завершено',
    text: 'Улучшение уже действует. Список исследований и прогресс доступны по кнопке в шапке.',
  },
  threat: {
    title: 'Под ударом',
    text: 'Ваш объект получил урон. Сводка следующего хода сохранит известное место атаки, даже если оно скроется в тумане.',
  },
} as const;
export type HintId = keyof typeof HINTS;

export const TUTORIAL = [
  {
    id: 'controls',
    title: 'Управление',
    text: 'ЛКМ выберите рабочего, затем ПКМ по свободной соседней клетке — идти. Камера: WASD, стрелки или Пробел + ЛКМ. Все клавиши — F1.',
  },
  {
    id: 'build',
    title: 'Постройка',
    text: 'Выберите рабочего, нажмите B и выберите рудник или лесопилку. Рудник строится на золоте, лесопилка — на лесе. Можно приказать ПКМ по ресурсу.',
  },
  {
    id: 'gold',
    title: 'Добыча золота',
    text: 'Выберите рабочего: ПКМ по своему руднику → «Работать» в мини-меню, либо G рядом с рудником. Закончите ход — рабочий внутри с рабочим действием принесёт золото.',
  },
  {
    id: 'wood',
    title: 'Добыча дерева',
    text: 'Постройте лесопилку и назначьте в неё рабочего. Дерево поступит в конце своего хода. После стройки рабочее действие восстановится в следующий ход.',
  },
  {
    id: 'spawn',
    title: 'Найм и население',
    text: 'Выберите ратушу: 1 — рабочий, 2 — разведчик. Выберите подсвеченную клетку. Для найма нужны ресурсы, действие здания и место в лимите населения; ферма увеличивает лимит.',
  },
  {
    id: 'scout',
    title: 'Разведка',
    text: 'Отправьте разведчика ПКМ по клетке или включите авторазведку клавишей E. Неизвестное считается проходимым; открытая преграда меняет маршрут.',
  },
  {
    id: 'endTurn',
    title: 'Конец хода',
    text: 'Завершите свой ход кнопкой в шапке или Enter. Доход начисляется в конце хода, очки восстанавливаются в начале следующего своего хода.',
  },
  {
    id: 'victory',
    title: 'Цель победы',
    text: 'Уничтожьте ратуши противников и сохраните свою. Потеря ратуши выводит участника из партии. Обучение завершено — продолжайте играть.',
  },
] as const;
export type TutorialStep = (typeof TUTORIAL)[number]['id'];

/** Шаги отмечаются только успешными командами и фактической добычей. */
export const completedBy = (
  { type, actor, details }: JournalEntry,
  player: ParticipantId,
): TutorialStep[] => {
  if (actor !== player) return [];
  if (type === 'move')
    return details?.unitType === 'scout' ? ['controls', 'scout'] : ['controls'];
  if (type === 'order' && details?.explore === 1) return ['scout'];
  if (type === 'build') return ['build'];
  if (type === 'spawn') return ['spawn'];
  if (type === 'endTurn') return ['endTurn'];
  if (type === 'income')
    return [
      ...(details?.minedGold ? ['gold' as const] : []),
      ...(details?.minedWood ? ['wood' as const] : []),
    ];
  return [];
};

export const hintFor = (
  entry: JournalEntry,
  player: ParticipantId,
): HintId | null => {
  if (entry.type === 'enemySpotted') return 'enemy';
  if (entry.type === 'build' && entry.actor === player) return 'building';
  if (entry.type === 'researchDone' && entry.actor === player)
    return 'research';
  if (entry.type === 'attackObserved' && entry.details?.owner === player)
    return 'threat';
  return null;
};

export type SummaryItem = {
  key: string;
  text: string;
  count: number;
  position?: Position;
};

/** Только снимок журнала: никаких обращений к живым объектам или скрытой карте. */
export const summaryItem = (
  entry: JournalEntry,
  player: ParticipantId,
): SummaryItem | null => {
  const { type, details = {} } = entry;
  const own = details.owner === player;
  let text: string;
  if (type === 'unitDestroyed' && own) {
    text = `Потерян юнит: ${UNITS_NAME[details.unitType as keyof typeof UNITS_NAME] ?? 'юнит'}`;
  } else if (type === 'buildingDestroyed' && own && !details.demolished) {
    text = `Разрушено здание: ${BUILDINGS_NAME[details.buildingType as keyof typeof BUILDINGS_NAME] ?? 'здание'}`;
  } else if (type === 'attackObserved') {
    text = own ? 'Атака на ваш объект' : 'Замечена атака';
  } else if (type === 'researchDone' && entry.actor === player) {
    text = `Завершено: ${RESEARCH_CONFIG[details.research as keyof typeof RESEARCH_CONFIG]?.name ?? 'исследование'}`;
  } else if (type === 'enemySpotted') {
    text = 'Враг появился в обзоре';
  } else return null;
  const { x, y } = details;
  const position =
    typeof x === 'number' && typeof y === 'number' ? { x, y } : undefined;
  return { key: `${type}:${text}:${x}:${y}`, text, count: 1, position };
};
