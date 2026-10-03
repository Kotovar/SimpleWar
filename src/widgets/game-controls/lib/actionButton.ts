import {
  ACTIONS,
  SLOT_CODES,
  type ActionId,
  type Building,
  type BuildingType,
  type Cost,
  type PopulationCap,
  type ResearchType,
  type Resources,
  type Unit,
  type UnitType,
} from '@shared/config';

/**
 * Кнопка нижней панели. `id` — действие и, для слотов и целей, через
 * двоеточие тип или ID объекта: `build:farm`, `spawn:archer`, `repair:<id>`.
 */
export type ActionButton = {
  id: string;
  label: string;
  /** Физическая клавиша (`KeyboardEvent.code`). */
  code?: string;
  hint: string;
  /** Почему недоступна; нет — доступна. */
  reason?: string;
  /** Режим кнопки включён: выбрано здание, прицел, расчистка. */
  pressed?: boolean;
  cost?: Cost & { population?: number };
  /** Портрет объекта для слотов стройки и найма. */
  portrait?: UnitType | BuildingType;
  /** Подменю: кнопка открывает слоты `1`…`0`. */
  children?: ActionButton[];
};

/** Сведения для кнопок выбранного; собираются из хранилищ вызывающим. */
export type SelectionActionInput = {
  /** Свой выбранный юнит. */
  unit: Unit | null;
  /** Своё выбранное здание. */
  building: Building | null;
  /** Свой ход: в чужой ход все кнопки недоступны. */
  isTurn: boolean;
  /** Запасы с учётом отладочных исключений для стройки и найма. */
  payableBuild: Resources;
  payableSpawn: Resources;
  /** Настоящие запасы: ремонт и исследования. */
  stock: Resources;
  population: PopulationCap;
  researched: readonly ResearchType[];
  researching: ResearchType | null;
  /** Свои здания рядом с юнитом или под ним. */
  nearby: readonly Building[];
  /** Рабочие места, занятые другими рабочими. */
  takenWorkplaces: ReadonlySet<string>;
  /** Рабочий внутри выбранного здания. */
  workerInside: Unit | null;
  /** Включённые режимы карты. */
  mode: {
    building: BuildingType | null;
    unit: UnitType | null;
    clearing: boolean;
    striking: boolean;
    rally?: boolean;
  };
};

/** Кнопка из справочника; `extra` уточняет цель (`id`), подсказку и состояние. */
export const action = (
  id: ActionId,
  extra: Partial<Omit<ActionButton, 'label' | 'code'>> = {},
): ActionButton => ({ id, ...ACTIONS[id], ...extra });

export const slot = (index: number) => SLOT_CODES[index];

export const NO_BUILD_POINT = 'Нет очка стройки';
