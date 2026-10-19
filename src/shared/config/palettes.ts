import type { Owner } from './common';
import type { Participant } from './gameLoop';
import { TEAM_MARKERS } from './draws';
import { MAX_PARTICIPANTS } from './map';

export type TeamStyle = (typeof TEAM_MARKERS)[Owner];
export type TeamStyles = Record<Owner, TeamStyle>;

/** Одежда, крыши и подложки сторон; форма маркера остаётся свойством слота. */
export const PALETTES = {
  blue: { ...TEAM_MARKERS.p1, name: 'Синие' },
  red: { ...TEAM_MARKERS.p2, name: 'Красные' },
  yellow: { ...TEAM_MARKERS.p3, name: 'Жёлтые' },
  purple: { ...TEAM_MARKERS.p4, name: 'Фиолетовые' },
  green: {
    name: 'Зелёные',
    color: '#9cdd83',
    shade: '#4c9655',
    background: '#234431',
  },
  orange: {
    name: 'Оранжевые',
    color: '#ffc077',
    shade: '#c57c34',
    background: '#54371e',
  },
  cyan: {
    name: 'Бирюзовые',
    color: '#6fe0d2',
    shade: '#329d94',
    background: '#204746',
  },
  pink: {
    name: 'Розовые',
    color: '#f3a4d2',
    shade: '#b75b93',
    background: '#502c43',
  },
} satisfies Record<string, Omit<TeamStyle, 'marker'> & { name: string }>;

export type PaletteId = keyof typeof PALETTES;
export type PaletteChoice = PaletteId | 'random';
export type PaletteChoices = Record<Owner, PaletteChoice>;
export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];
export const DEFAULT_PALETTES: Record<Owner, PaletteId> = {
  p1: 'blue',
  p2: 'red',
  p3: 'yellow',
  p4: 'purple',
};

export const getTeamStyle = (
  owner: Owner,
  palette = DEFAULT_PALETTES[owner],
): TeamStyle => ({
  ...PALETTES[palette],
  marker: TEAM_MARKERS[owner].marker,
});

/** Значение — ID участника: записи журнала из сохранения могут быть неполными. */
export const isParticipantId = (value: unknown): value is Owner =>
  typeof value === 'string' && Object.hasOwn(TEAM_MARKERS, value);

export const getParticipantPalette = (
  owner: Owner,
  participants: readonly Participant[],
) => participants.find(p => p.id === owner)?.palette ?? DEFAULT_PALETTES[owner];

export const getParticipantName = (
  owner: Owner,
  participants: readonly Participant[],
) => PALETTES[getParticipantPalette(owner, participants)].name;

/** Имя стороны в родительном падеже: «Ход Жёлтых», «Ход Синих». */
export const getParticipantGenitive = (
  owner: Owner,
  participants: readonly Participant[],
) =>
  getParticipantName(owner, participants)
    .replace(/ые$/, 'ых')
    .replace(/ие$/, 'их');

export const getParticipantStyles = (
  participants: readonly Participant[],
): TeamStyles => {
  const styles = { ...TEAM_MARKERS };
  for (const { id, palette } of participants)
    styles[id] = getTeamStyle(id, palette);
  return styles;
};

/** Сначала резервирует ручной выбор, затем раздаёт оставшиеся цвета без повторов. */
export const resolvePaletteChoices = (
  choices: readonly PaletteChoice[],
  random = Math.random,
): PaletteId[] | null => {
  const manual = choices.filter((id): id is PaletteId => id !== 'random');
  if (
    choices.length < 2 ||
    choices.length > MAX_PARTICIPANTS ||
    manual.some(id => !Object.hasOwn(PALETTES, id)) ||
    new Set(manual).size !== manual.length
  )
    return null;
  const free = PALETTE_IDS.filter(id => !manual.includes(id));
  return choices.map(id =>
    id === 'random'
      ? free.splice(Math.floor(random() * free.length), 1)[0]
      : id,
  );
};
