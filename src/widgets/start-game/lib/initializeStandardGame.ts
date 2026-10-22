import {
  MAP_PRESETS,
  PARTICIPANT_IDS,
  resolvePaletteChoices,
  type Participant,
} from '@shared/config';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { initializeGame } from './initializeGame';

/** Обычная партия: человек против настроенных в меню ИИ. */
export const initializeStandardGame = (): Participant[] | null => {
  const { aiSetups, gridColumns, gridRows, paletteChoices, teamChoices } =
    useSettingsStore.getState();
  const palettes = resolvePaletteChoices(
    PARTICIPANT_IDS.slice(0, aiSetups.length + 1).map(id => paletteChoices[id]),
  );
  if (!palettes) {
    useGameLoopStore.setState({
      startError: 'Выберите разные цвета для участвующих сторон.',
    });
    return null;
  }
  if (
    aiSetups.length > 1 &&
    (gridColumns < MAP_PRESETS.large.cols || gridRows < MAP_PRESETS.large.rows)
  ) {
    useGameLoopStore.setState({
      startError: 'Для 3–4 участников выберите карту не меньше 30 × 30 клеток.',
    });
    return null;
  }
  const participants: Participant[] = [
    { id: 'p1', controller: 'human', palette: palettes[0] },
    ...aiSetups.map(
      (ai, index): Participant => ({
        id: PARTICIPANT_IDS[index + 1],
        controller: 'ai',
        ai,
        palette: palettes[index + 1],
      }),
    ),
  ];
  for (const p of participants) p.team = teamChoices[p.id];
  return initializeGame(participants) ? participants : null;
};
