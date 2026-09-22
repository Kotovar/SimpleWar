export const CELL_SIZE = 32;

/** Границы масштаба карты: клетка мельче 18 px нечитаема, крупнее 64 px не даёт обзора. */
export const CELL_SIZE_LIMITS = { min: 18, max: 64, step: 1.15 };

export const MAP_PRESETS = {
  small: { cols: 15, rows: 15 },
  medium: { cols: 24, rows: 24 },
  large: { cols: 30, rows: 30 },
  extra: { cols: 40, rows: 40 },
};

export const MAP_PRESET_LABELS: Record<keyof typeof MAP_PRESETS, string> = {
  small: 'Маленькая',
  medium: 'Средняя',
  large: 'Большая',
  extra: 'Огромная',
};

export const TEMP_START_SEED = 0.15;
