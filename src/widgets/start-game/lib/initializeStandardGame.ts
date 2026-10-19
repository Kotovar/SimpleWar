import { MAP_PRESETS, PARTICIPANT_IDS, type Participant } from '@shared/config';
import { useGameLoopStore } from '@entities/games';
import { useSettingsStore } from '@entities/settings';
import { initializeGame } from './initializeGame';

/** Обычная партия: человек против настроенных в меню ИИ. */
export const initializeStandardGame = (): Participant[] | null => {
  const { aiSetups, gridColumns, gridRows } = useSettingsStore.getState();
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
    { id: 'p1', controller: 'human' },
    ...aiSetups.map(
      (ai, index): Participant => ({
        id: PARTICIPANT_IDS[index + 1],
        controller: 'ai',
        ai,
      }),
    ),
  ];
  return initializeGame(participants) ? participants : null;
};
