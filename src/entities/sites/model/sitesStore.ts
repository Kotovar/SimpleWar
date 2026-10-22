import { create } from 'zustand';
import type { Site, Building } from '@shared/config';
import { withDevtools, gameEvents } from '@shared/lib';

type SitesState = {
  sites: Record<string, Site>;
  setSites: (sites: Site[]) => void;
  getSiteAt: (x: number, y: number) => Site | null;
  removeSite: (id: string) => void;
  /** Возвращает нейтральные руины после потери аванпостов. */
  restoreOutpostRuins: (buildings: readonly Building[]) => void;
  resetStore: () => void;
};

export const useSitesStore = create<SitesState>()(
  withDevtools('sites', (set, get) => ({
    sites: {},
    setSites: sites =>
      set({ sites: Object.fromEntries(sites.map(s => [s.id, s])) }),
    getSiteAt: (x, y) =>
      Object.values(get().sites).find(site => site.x === x && site.y === y) ??
      null,
    removeSite: id =>
      set(state => {
        delete state.sites[id];
      }),
    restoreOutpostRuins: buildings =>
      set(state => {
        for (const building of buildings) {
          if (building.type !== 'outpost') continue;
          const id = `site_ruins_${building.id}`;
          state.sites[id] = { id, type: 'ruins', x: building.x, y: building.y };
        }
      }),
    resetStore: () => set({ sites: {} }),
  })),
);

// Подписка одна на приложение; разрушение и снос используют один путь.
gameEvents.subscribe(event => {
  if (event.type === 'BUILDING_DESTROYED' && event.building.type === 'outpost')
    useSitesStore.getState().restoreOutpostRuins([event.building]);
});
