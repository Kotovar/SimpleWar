import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vite-plus/test';
import { SFX_TONES, SFX_VARIANTS, getSfxFiles, type Sfx } from './audio';

const SFX_DIR = 'public/audio/sfx';
const MUSIC_DIR = 'public/audio/music';

describe('файлы звука', () => {
  it('SFX_VARIANTS совпадает с файлами эффектов', () => {
    const expected = (Object.keys(SFX_TONES) as Sfx[])
      .flatMap(sfx => getSfxFiles(sfx))
      .sort();
    expect(readdirSync(SFX_DIR).sort()).toEqual(expected);
  });

  it('одна вариация — без номера, несколько — с номерами', () => {
    expect(getSfxFiles('click', 1)).toEqual(['click.mp3']);
    expect(getSfxFiles('attack', 2)).toEqual(['attack1.mp3', 'attack2.mp3']);
    expect(getSfxFiles('attack', 0)).toEqual([]);
    expect(Object.keys(SFX_VARIANTS).length).toBeGreaterThan(0);
  });

  it('у каждой темы музыки есть файл', () => {
    for (const track of ['menu', 'peace', 'battle', 'victory', 'defeat']) {
      expect(existsSync(`${MUSIC_DIR}/${track}.mp3`), track).toBe(true);
    }
  });
});
