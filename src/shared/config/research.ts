import type { Cost } from './economy';

/** Исследования кузницы (S16): каждое меняет правило, а не число. */
export type ResearchType =
  | 'formation'
  | 'cartography'
  | 'engineering'
  | 'hiddenAiming'
  | 'artel';

/** Цена, срок в своих ходах и описание исследования. */
export type ResearchConfig = {
  name: string;
  /** Новое правило — для панели и подсказок. */
  effect: string;
  cost: Cost;
  /** Сколько своих завершённых ходов с кузницей нужно, включая ход запуска. */
  turns: number;
};

/** Старт для первой реализации; цены и сроки проверяются в S21. */
export const RESEARCH_CONFIG: Record<ResearchType, ResearchConfig> = {
  formation: {
    name: 'Строй',
    effect:
      'Копейщик, у которого по стороне стоит свой копейщик, получает +2 физической защиты',
    cost: { gold: 100, wood: 60 },
    turns: 3,
  },
  cartography: {
    name: 'Картография',
    effect:
      'Контакт с вражеским юнитом, замеченным разведчиком, помнится на 2 хода дольше',
    cost: { gold: 80, wood: 60 },
    turns: 2,
  },
  engineering: {
    name: 'Инженерия',
    effect:
      'Рабочий строит частокол: непроходимое укрепление на поле или холме',
    cost: { gold: 100, wood: 100 },
    turns: 3,
  },
  hiddenAiming: {
    name: 'Скрытая наводка',
    effect:
      'Отметку удара осадной машины враг видит, только если цель в обзоре его разведчика',
    cost: { gold: 120, wood: 80 },
    turns: 3,
  },
  artel: {
    name: 'Артель',
    effect:
      'Рабочий на добыче может в тот же ход строить, расчищать лес или чинить, не теряя добычу',
    cost: { gold: 100, wood: 100 },
    turns: 3,
  },
};

/** Порядок исследований в панели. */
export const RESEARCH_TYPES = Object.keys(RESEARCH_CONFIG) as ResearchType[];

/** Строй: прибавка к физической защите копейщика с соседом-копейщиком. */
export const FORMATION_ARMOR = 2;

/** Картография: на столько кругов дольше помнится контакт от разведчика. */
export const CARTOGRAPHY_EXTRA_MEMORY = 2;
