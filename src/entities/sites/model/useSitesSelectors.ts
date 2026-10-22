import { useSitesStore } from './sitesStore';

export const useSitesSelectors = () => {
  const sites = useSitesStore(state => state.sites);
  const getSiteAt = useSitesStore(state => state.getSiteAt);
  return { sites, getSiteAt };
};
