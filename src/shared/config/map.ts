import type { CellType } from './common';

/** Размер клетки в пикселях. */
export const CELL_SIZE = 32;

/** Границы масштаба карты: клетка мельче 18 px нечитаема, крупнее 64 px не даёт обзора. */
export const CELL_SIZE_LIMITS = { min: 18, max: 64, step: 1.15 };

/** Размеры карт для каждого пресета в клетках. */
export const MAP_PRESETS = {
  small: { cols: 15, rows: 15 },
  medium: { cols: 24, rows: 24 },
  large: { cols: 30, rows: 30 },
  extra: { cols: 40, rows: 40 },
};

/** Человекочитаемые названия пресетов карт. */
export const MAP_PRESET_LABELS: Record<keyof typeof MAP_PRESETS, string> = {
  small: 'Маленькая',
  medium: 'Средняя',
  large: 'Большая',
  extra: 'Огромная',
};

/**
 * Цена входа наземного юнита в клетку. Местности нет в списке — она
 * непроходима. Путь стоит сумму цен входа в клетки, без диагоналей.
 */
export const MOVE_COST: Partial<Record<CellType, number>> = {
  grass: 1,
  hill: 2,
  swamp: 2,
};

/**
 * Версия генератора карт. Повышается при любом изменении, из-за которого
 * тот же сид даёт другую карту: сид воспроизводим только вместе с версией.
 */
export const MAP_GENERATOR_VERSION = 3;

/** Максимум воспроизводимых попыток (сид, сид + 1, ...) до резервной раскладки. */
export const MAP_ATTEMPTS = 10;

/**
 * Допустимая разница в цене пути от стартов до ближайшего подхода к золоту
 * и к лесу. Старт; порог подбирается в S21.
 */
export const START_FAIRNESS_TOLERANCE = 4;

/** Число участников, для которых есть стартовые позиции (по углам карты). */
export const MAX_PARTICIPANTS = 4;

/**
 * Минимальная сторона карты: двум стартам хватает 5 клеток, трём и четырём
 * нужно место, чтобы стартовые зоны соседних углов не пересекались.
 */
export const MIN_MAP_SIDE = { duel: 5, group: 9 };

/** Предлагаемый стартовый сид. */
export const TEMP_START_SEED = 43;
