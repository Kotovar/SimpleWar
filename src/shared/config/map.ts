export const MAP_PRESETS = {
  small: { canvas: { w: 600, h: 600 }, grid: { cols: 15, rows: 15 } },
  medium: { canvas: { w: 720, h: 720 }, grid: { cols: 24, rows: 24 } },
  large: { canvas: { w: 840, h: 840 }, grid: { cols: 30, rows: 30 } },
  extra: { canvas: { w: 1200, h: 1200 }, grid: { cols: 40, rows: 40 } },
};

export const MAP_PRESET_LABELS: Record<
  keyof typeof MAP_PRESETS,
  { canvas: string; grid: string }
> = {
  small: { canvas: 'Маленькая', grid: 'Небольшое' },
  medium: { canvas: 'Средняя', grid: 'Среднее' },
  large: { canvas: 'Большая', grid: 'Большое' },
  extra: { canvas: 'Огромная', grid: 'Огромное' },
};

export const TEMP_START_SEED = 0.15;
