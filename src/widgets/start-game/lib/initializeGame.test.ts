import { expect, it } from 'vite-plus/test';
import { useMapStore } from '@entities/maps';
import { useSettingsStore } from '@entities/settings';
import { resetGame } from '@features/game-loop';
import { initializeGame } from './initializeGame';

it('соседние сиды дают разные карты, даже если первый кандидат отбракован', () => {
  const maps = new Set<string>();
  for (let seed = 0; seed < 20; seed++) {
    resetGame();
    useSettingsStore.setState({
      gridColumns: 30,
      gridRows: 30,
      mapGenerationMode: 'fixed',
      customSeed: seed,
    });
    expect(initializeGame()).toBe(true);
    maps.add(
      useMapStore
        .getState()
        .grid.flat()
        .map(cell => cell.type)
        .join(),
    );
  }
  expect(maps.size).toBe(20);
});
