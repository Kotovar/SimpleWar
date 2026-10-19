import { createHash } from 'node:crypto';
import { MAP_PRESETS } from '@shared/config';
import { expect, it } from 'vite-plus/test';
import { generateMap, useMapStore } from '@entities/maps';
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

// Снимки v5 до M2: сырой рельеф и принятые карты, включая повторы генерации.
const duelFingerprints = {
  small: '531d9f8aa51fb02db57c299a0074ebf2678a780e9a5bf1f0410f5811ec2c1274',
  medium: '927cb0a0b19aa971abcebdd98b3fce563f5b028f0e8114ce04f9bee5086ec209',
  large: '55894b859d3b918d15fbd634d3e825ef4b84e7bbc074dee991a9c549d9b6b99d',
  extra: 'a873899b9e3c5fa6415c493fdf1e2e37b434406938181379f8e758f4b7ceca8f',
  wide: '64399201c999aa771a36f4998f7707319204c9c2e951486b8c82a434b10c9f62',
  huge: '3da83f9f3baa2525bcf9b6e6f648b761d4cd700e668bc6a379d11f50eba5ddf3',
};

it.each(Object.entries(MAP_PRESETS))(
  'сохраняет карты v5 на двоих для %s',
  (preset, { cols, rows }) => {
    const hash = createHash('sha256');
    for (const seed of [0, 19, 43]) {
      hash.update(JSON.stringify(generateMap(cols, rows, seed)));
      resetGame();
      useSettingsStore.setState({
        gridColumns: cols,
        gridRows: rows,
        mapGenerationMode: 'fixed',
        customSeed: seed,
      });
      expect(initializeGame()).toBe(true);
      hash.update(JSON.stringify(useMapStore.getState().grid));
    }
    expect(hash.digest('hex')).toBe(
      duelFingerprints[preset as keyof typeof MAP_PRESETS],
    );
  },
);
