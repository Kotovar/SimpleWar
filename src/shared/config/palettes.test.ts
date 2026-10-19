import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_PALETTES,
  PALETTE_IDS,
  PALETTES,
  getParticipantName,
  getParticipantStyles,
  getTeamStyle,
  resolvePaletteChoices,
  type PaletteChoice,
} from './palettes';
import { TEAM_MARKERS } from './draws';

describe('палитры сторон', () => {
  it('содержит минимум восемь разных цветов и названий', () => {
    expect(PALETTE_IDS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(Object.values(PALETTES).map(p => p.color)).size).toBe(
      PALETTE_IDS.length,
    );
    expect(new Set(Object.values(PALETTES).map(p => p.name)).size).toBe(
      PALETTE_IDS.length,
    );
  });
  it('сохраняет прежние цвета и маркеры слотов', () => {
    for (const id of ['p1', 'p2', 'p3', 'p4'] as const) {
      expect(getTeamStyle(id, DEFAULT_PALETTES[id])).toMatchObject(
        TEAM_MARKERS[id],
      );
    }
    expect(getTeamStyle('p2', 'green').marker).toBe('diamond');
  });
  it('берёт цвет и название из участника, сохраняя маркер слота', () => {
    const participants = [
      { id: 'p1', controller: 'human', palette: 'pink' },
    ] as const;
    expect(getParticipantName('p1', participants)).toBe('Розовые');
    expect(getParticipantStyles(participants).p1).toMatchObject({
      color: PALETTES.pink.color,
      marker: 'circle',
    });
  });
  it('резервирует ручной выбор прежде случайного', () => {
    expect(
      resolvePaletteChoices(['random', 'blue', 'pink', 'random'], () => 0),
    ).toEqual(['red', 'blue', 'pink', 'yellow']);
  });
  it.each([2, 3, 4])('назначает %s случайных палитр без повторов', count => {
    const choices: PaletteChoice[] = Array.from(
      { length: count },
      () => 'random',
    );
    for (const random of [() => 0, () => 0.9999]) {
      const result = resolvePaletteChoices(choices, random)!;
      expect(result).toHaveLength(count);
      expect(new Set(result).size).toBe(count);
      expect(result.every(id => PALETTE_IDS.includes(id))).toBe(true);
    }
    expect(choices).toEqual(Array.from({ length: count }, () => 'random'));
  });
  it('отклоняет повторяющийся ручной выбор', () => {
    expect(resolvePaletteChoices(['green', 'green'])).toBeNull();
  });
});
