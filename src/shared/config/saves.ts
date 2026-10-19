/** Формат и лимиты локальных сохранений S20. */
export const SAVE_VERSION = 1;
export const MANUAL_SLOTS = 5;
export const MAX_SAVE_BYTES = 8 * 1024 * 1024;
export type AutoSettings = {
  enabled: boolean;
  interval: 1 | 3 | 5;
  keep: number;
};
export const DEFAULT_AUTO: AutoSettings = {
  enabled: true,
  interval: 1,
  keep: 3,
};
