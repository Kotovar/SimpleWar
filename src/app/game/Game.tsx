import { useEffect } from 'react';
import { Map } from '@widgets/map';
import { useStartGame } from '@widgets/start-game';
import { GameControls } from '@widgets/game-controls';
import styles from './styles.module.css';

export const Game = () => {
  const startGame = useStartGame();

  useEffect(() => {
    startGame();
  }, [startGame]);

  return (
    <main className={styles.Main}>
      <Map />
      <GameControls />
    </main>
  );
};
