import type { Position } from './common';

export const SITE_TYPES = [
  'cache',
  'refugees',
  'obelisk',
  'ruins',
  'camp',
] as const;
export type SiteType = (typeof SITE_TYPES)[number];

export const SITES_NAME: Record<SiteType, string> = {
  cache: 'Тайник',
  refugees: 'Беженцы',
  obelisk: 'Обелиск',
  ruins: 'Руины поселения',
  camp: 'Лагерь наёмников',
};

/** Находки на сторону на карте 30 × 30; групповые карты сохраняют четыре угла. */
export const SITE_COUNTS = { cache: 2, refugees: 1, obelisk: 1, ruins: 1 };
export const SITE_MIN_START_DISTANCE = 6;
export const CACHE_REWARDS = { gold: [60, 120], wood: [80, 140] } as const;
export const CAMP_HIRES = 3;
export const OBELISK_REVEAL_RADIUS = 10;

/** Нейтральная находка; содержимое фиксируется при генерации, владельца нет. */
export type Site = Position & { id: string } & (
    | { type: 'cache'; resource: keyof typeof CACHE_REWARDS; amount: number }
    | { type: 'camp'; hiresLeft: number }
    | { type: 'refugees' | 'obelisk' | 'ruins' }
  );
