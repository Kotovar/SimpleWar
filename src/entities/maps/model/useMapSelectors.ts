import { useMapStore } from './mapStore';

export const useMapSelectors = () => {
  const grid = useMapStore(state => state.grid);
  const getCell = useMapStore(state => state.getCell);

  return { grid, getCell };
};
