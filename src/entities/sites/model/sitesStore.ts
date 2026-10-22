import { create } from 'zustand';
import type { Site } from '@shared/config';
import { withDevtools } from '@shared/lib';

type SitesState = {
  sites: Record<string, Site>;
  setSites: (sites: Site[]) => void;
  getSiteAt: (x: number, y: number) => Site | null;
  removeSite: (id: string) => void;
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
    resetStore: () => set({ sites: {} }),
  })),
);
