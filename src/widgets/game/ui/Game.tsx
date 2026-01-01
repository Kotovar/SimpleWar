import { useEffect } from 'react';
import { GRID_SIZE } from '@shared/config';
import { Map } from './Map';
import { GameControls } from './GameControls';
import { useMapStore } from '../model';
import styles from './Game.styles.module.css';

const TEMP_START_SEED = 0.14;

export const Game = () => {
  useEffect(() => {
    const { initMap, setUnit } = useMapStore.getState();

    initMap(GRID_SIZE, TEMP_START_SEED);
    setUnit(2, 1, 'swordsman');
    setUnit(GRID_SIZE - 3, GRID_SIZE - 2, 'swordsman');
  }, []);

  return (
    <main className={styles.Main}>
      <Map />
      <GameControls />
    </main>
  );
};
